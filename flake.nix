{
  description = "NightHawk CLI";

  inputs = {
    # Pinned to the 25.11 release channel because nixpkgs-unstable currently
    # ships nodejs_24 = 24.14.1, which trips the >= 24.15.0 floor that the
    # native SEA build enforces (see apps/nighthawk/scripts/native/build.mjs).
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
  };

  outputs =
    { self, nixpkgs }:
    let
      lib = nixpkgs.lib;

      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      forAllSystems =
        f:
        lib.genAttrs systems (
          system:
          f (import nixpkgs {
            inherit system;
          })
        );

      minNodeVersion = "24.15.0";

      # Hardcode to Node.js 24.x; fail the evaluation if the pinned nixpkgs
      # does not offer a new enough 24.x.
      nodejsFor =
        pkgs:
        let
          node = pkgs.nodejs_24;
        in
        if lib.versionAtLeast node.version minNodeVersion then
          node
        else
          throw ''
            NightHawk requires Node.js >= ${minNodeVersion},
            but nixpkgs only offers ${node.version}.
            Pin a newer nixpkgs revision or update minNodeVersion in flake.nix.
          '';

      pnpmFor =
        pkgs:
        pkgs.pnpm_10.override {
          nodejs = nodejsFor pkgs;
        };

      # -------------------------------------------------------------------
      # Workspace members (kept in sync with pnpm-workspace.yaml).
      #
      # HARD REQUIREMENT: whenever you add or remove a workspace package,
      # you MUST update both lists below. Missing a path will break the Nix
      # build (src fileset silently drops files); missing a name will break
      # pnpmConfigHook (dependencies for that workspace won't be fetched).
      # -------------------------------------------------------------------
      workspacePaths = [
        ./packages/acp-server
        ./packages/agent-core-v2
        ./packages/kap-server
        ./packages/klient
        ./packages/migration-legacy
        ./packages/minidb
        ./packages/node-sdk
        ./packages/oauth
        ./packages/pi-tui
        ./packages/product
        ./packages/remote-control
        ./packages/session-import
        ./packages/telemetry
        ./packages/transcript
        ./packages/tree-sitter-bash
        ./apps/nighthawk
        ./apps/vscode
        ./apps/vis
        ./apps/vis/server
        ./apps/vis/web
        ./docs
      ];

      workspaceNames = [
        "@nighthawk/acp-server"
        "@nighthawk/agent-core-v2"
        "@nighthawk/kap-server"
        "@nighthawk/migration-legacy"
        "@nighthawk/minidb"
        "@nighthawk/nighthawk-sdk"
        "@nighthawk/nighthawk-oauth"
        "@nighthawk/klient"
        "@nighthawk/pi-tui"
        "@nighthawk/nighthawk-product"
        "@nighthawk/remote-control"
        "@nighthawk/session-import"
        "@nighthawk/nighthawk-telemetry"
        "@nighthawk/transcript"
        "@nighthawk/tree-sitter-bash"
        "@nighthawk/nighthawk"
        "nighthawk"
        "@nighthawk/vis"
        "@nighthawk/vis-server"
        "@nighthawk/vis-web"
        "nighthawk-docs"
      ];
    in
    {
      packages = forAllSystems (
        pkgs:
        let
          nodejs = nodejsFor pkgs;
          pnpm = pnpmFor pkgs;
          appPackageJson = builtins.fromJSON (builtins.readFile ./apps/nighthawk/package.json);
          nativeTarget =
            if pkgs.stdenv.hostPlatform.isLinux && pkgs.stdenv.hostPlatform.isAarch64 then
              "linux-arm64"
            else if pkgs.stdenv.hostPlatform.isLinux then
              "linux-x64"
            else if pkgs.stdenv.hostPlatform.isDarwin && pkgs.stdenv.hostPlatform.isAarch64 then
              "darwin-arm64"
            else if pkgs.stdenv.hostPlatform.isDarwin then
              "darwin-x64"
            else
              throw "Unsupported NightHawk native target for ${pkgs.stdenv.hostPlatform.system}";

          nighthawk = pkgs.stdenv.mkDerivation (finalAttrs: {
            pname = "nighthawk";
            version = appPackageJson.version;

            src = lib.fileset.toSource {
              root = ./.;
              fileset = lib.fileset.unions (
                [
                  ./build
                  ./.npmrc
                  ./.nvmrc
                  ./package.json
                  ./pnpm-lock.yaml
                  ./pnpm-workspace.yaml
                  ./tsconfig.json
                  ./vitest.config.ts
                  ./LICENSE
                ]
                ++ workspacePaths
              );
            };

            pnpmWorkspaces = [ "." ] ++ workspaceNames;

            pnpmDeps = pkgs.fetchPnpmDeps {
              inherit (finalAttrs) pname version src pnpmWorkspaces;
              inherit pnpm;
              fetcherVersion = 3;
              hash = "sha256-S7kwWgHbN5ZH4xIH7W/9sbOXi7/JhaitX/ONsLmRr9E=";
            };

            nativeBuildInputs = [
              nodejs
              pnpm
              (pkgs.pnpmConfigHook.override { inherit pnpm; })
              pkgs.makeWrapper
            ]
            # The SEA inject step (postject) invalidates the macOS code
            # signature on the copied Node executable; build.mjs then re-applies
            # an ad-hoc signature via `codesign`. The Nix darwin sandbox does
            # not expose /usr/bin/codesign, so we supply nixpkgs' ad-hoc-only
            # replacement instead.
            ++ lib.optionals pkgs.stdenv.hostPlatform.isDarwin [
              pkgs.darwin.sigtool
            ];

            # The SEA binary is produced by `postject`-injecting a blob into a
            # plain Node executable. Stripping rewrites section tables and can
            # invalidate the injected blob's offsets, so leave the binary
            # untouched after the build.
            dontStrip = true;

            buildPhase = ''
              runHook preBuild
              export NIGHTHAWK_BUILD_TARGET=${nativeTarget}
              ${lib.optionalString pkgs.stdenv.hostPlatform.isDarwin ''
                # pkgs.darwin.sigtool's codesign supports `--sign -` (ad-hoc)
                # but not the inspection mode (`-dv`) that 05-verify.mjs runs
                # afterwards. Disable the verify step for the Nix build; the
                # release CI keeps it via the unmodified script.
                substituteInPlace apps/nighthawk/scripts/native/build.mjs \
                  --replace-fail \
                    "await runVerifyStep({ requireGatekeeper: false });" \
                    "// runVerifyStep skipped in nix sandbox (sigtool lacks -dv)"
              ''}
              # The SEA blob step (scripts/native/02-sea-blob.mjs) embeds the
              # NightHawk web assets from apps/nighthawk/dist-web and fails if that
              # directory is missing. The bundle is committed (synced from the
              # code-app repo) — verify it is in place before producing the
              # native executable.
              node apps/nighthawk/scripts/check-web-assets.mjs
              pnpm --filter=@nighthawk/nighthawk run build:native:sea
              runHook postBuild
            '';

            installPhase = ''
              runHook preInstall

              install -Dm755 \
                "apps/nighthawk/dist-native/bin/${nativeTarget}/nighthawk" \
                "$out/bin/nighthawk"

              runHook postInstall
            '';

            postInstall = ''
              wrapProgram $out/bin/nighthawk --prefix PATH : ${lib.makeBinPath [ pkgs.ripgrep pkgs.fd ]}
            '';

            meta = {
              description = "NightHawk CLI";
              homepage = "https://github.com/NightHawkOrg/nighthawk";
              license = lib.licenses.mit;
              mainProgram = "nighthawk";
              platforms = systems;
            };
          });
        in
        {
          inherit nighthawk;
          default = nighthawk;
        }
      );

      apps = forAllSystems (pkgs: {
        nighthawk = {
          type = "app";
          program = "${self.packages.${pkgs.system}.nighthawk}/bin/nighthawk";
        };
        default = self.apps.${pkgs.system}.nighthawk;
      });

      devShells = forAllSystems (pkgs: {
        default =
          let
            nodejs = nodejsFor pkgs;
            pnpm = pnpmFor pkgs;
          in
          pkgs.mkShell {
            packages = [
              nodejs
              pnpm
              pkgs.ripgrep
              pkgs.fd
            ];
          };
      });
    };
}
