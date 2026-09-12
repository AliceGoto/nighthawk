export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface SecurityRule {
  id: string;
  name: string;
  nameZh: string;
  severity: Severity;
  category: string;
  cwe?: string;
  owasp?: string;
  languages: string[];
  patterns: RegExp[];
  description: string;
  descriptionZh: string;
  fix: string;
  fixZh: string;
}

const sqliLangs = ['python', 'javascript', 'typescript', 'java', 'php', 'go', 'ruby'];
const sqliTemplates: Array<[string, RegExp, Severity, string]> = [
  ['cursor.execute', /(?:execute|executemany)\s*\(\s*[fF]?["'`][^"'`]*(?:SELECT|INSERT|UPDATE|DELETE|DROP|UNION)[\s\S]{0,80}["'`]\s*%/g, 'critical', 'CWE-89'],
  ['f-string SQL', /(?:execute|query|raw)\s*\(\s*f["'][^"']*(?:SELECT|INSERT|UPDATE|DELETE)[^"']*\{/g, 'critical', 'CWE-89'],
  ['string concat SQL', /(?:SELECT|INSERT|UPDATE|DELETE)\s[^;]{0,60}(?:\+\s*\w+|\$\{\s*\w+\}|%\s*\w+|"\s*\+\s*\w+)/gi, 'critical', 'CWE-89'],
  ['orm raw sql', /\.(?:raw|extra|whereRaw|orderByRaw)\s*\(\s*["'`][^"'`]*\+/g, 'critical', 'CWE-89'],
  ['string format SQL', /(?:execute|query)\s*\(\s*["'][^"']*%[sd]\s*["']\s*%/g, 'critical', 'CWE-89'],
  ['like injection', /LIKE\s+["'`]?\s*\{?\$?(?:req|params|query|args|request)/gi, 'high', 'CWE-89'],
  ['sequelize literal', /sequelize\.literal\s*\(\s*[^"'`]/g, 'high', 'CWE-89'],
  ['knex raw', /knex\.raw\s*\(\s*["'`][^"'`]*(?:\+|\$\{|%\s*\()/g, 'critical', 'CWE-89'],
  ['mybatis ${}', /\$\{[^}]+\}\s*(?:FROM|WHERE|ORDER BY|LIKE)/gi, 'critical', 'CWE-89'],
  ['golang fmt.Sprintf SQL', /fmt\.Sprintf\s*\(\s*["'`][^"'`]*(?:SELECT|INSERT|UPDATE|DELETE)/gi, 'critical', 'CWE-89'],
];
const sqliFix = 'Use parameterized queries / prepared statements. Never concatenate user input into SQL.';

const xssTemplates: Array<[string, RegExp, Severity, string]> = [
  ['innerHTML', /\.innerHTML\s*=\s*(?!["'`]\s*["'`])/g, 'high', 'CWE-79'],
  ['document.write', /document\.write\s*\(\s*(?!["'`])/g, 'high', 'CWE-79'],
  ['dangerouslySetInnerHTML', /dangerouslySetInnerHTML\s*=\s*\{\{/g, 'high', 'CWE-79'],
  ['eval html', /(?:html|htmlCode)\s*=\s*[^"'`]+;/g, 'medium', 'CWE-79'],
  ['v-html', /v-html\s*=\s*["'][^"']+["']/g, 'high', 'CWE-79'],
  ['jquery html', /\.(?:html|append|prepend)\s*\(\s*(?:req|params|query|location|input)/gi, 'high', 'CWE-79'],
  ['document.url write', /document\.write\s*\([^)]*(?:location|document\.URL|document\.referrer|document\.cookie|window\.name)/gi, 'high', 'CWE-79'],
  ['redirect unvalidated', /(?:window\.location|location\.href)\s*=\s*(?:req|params|query|request)\./g, 'medium', 'CWE-601'],
];
const xssFix = 'Sanitize with DOMPurify / escape output. Use textContent instead of innerHTML.';

const cmdiTemplates: Array<[string, RegExp, Severity, string, string[] | undefined]> = [
  ['os.system', /os\.system\s*\(/g, 'critical', 'CWE-78', ['python']],
  ['subprocess shell=True', /subprocess\.(?:run|call|Popen|check_output)\s*\([^)]*shell\s*=\s*True/g, 'critical', 'CWE-78', ['python']],
  ['eval', /\beval\s*\(/g, 'critical', 'CWE-95', ['javascript', 'typescript', 'python', 'ruby', 'php']],
  ['new Function', /new\s+Function\s*\(/g, 'critical', 'CWE-95', ['javascript', 'typescript']],
  ['exec sync', /(?:child_process\.)?exec(?:Sync)?\s*\(\s*[^"'`]/g, 'critical', 'CWE-78', ['javascript', 'typescript']],
  ['spawn shell', /(?:child_process\.)?spawn(?:Sync)?\s*\(\s*["'`]\/bin\/(?:sh|bash)/g, 'critical', 'CWE-78', ['javascript', 'typescript']],
  ['backtick shell', /`[^`]*(?:\$\{|\$)\s*(?:req|params|query|process\.argv|input)/g, 'high', 'CWE-78', ['javascript', 'typescript', 'ruby', 'php']],
  ['Runtime.exec', /Runtime\.getRuntime\(\)\.exec\s*\(/g, 'critical', 'CWE-78', ['java']],
  ['popen', /\bpopen\s*\(/g, 'critical', 'CWE-78', ['python', 'ruby', 'php', 'c', 'cpp']],
];
const cmdiFix = 'Avoid shell=True / eval. Use array-args APIs (subprocess with list, execFile) and allowlist commands.';

const pathTemplates: Array<[string, RegExp, Severity, string]> = [
  ['open user path', /open\s*\(\s*(?:req|params|query|args|request|input)[.[]/g, 'high', 'CWE-22'],
  ['fs read user path', /fs\.(?:readFile|readFileSync|writeFile|createReadStream|createWriteStream)\s*\(\s*(?:req|params|query|request)\./g, 'high', 'CWE-22'],
  ['sendFile user path', /sendFile\s*\(\s*(?:req|params|query)\./g, 'high', 'CWE-22'],
  ['join user path', /path\.join\s*\([^)]*(?:req|params|query|\.\.\/)/g, 'medium', 'CWE-22'],
  ['../ traversal literal', /["'`]\.\.[/\\]["'`]?|\.\.\/\.\.\//g, 'medium', 'CWE-22'],
  ['File user path', /new\s+File\s*\(\s*request\./g, 'high', 'CWE-22'],
];
const pathFix = 'Normalize and canonicalize paths; verify prefix with path.resolve; never trust raw user input as path.';

const ssrfTemplates: Array<[string, RegExp, Severity, string]> = [
  ['requests user url', /requests\.(?:get|post|put|delete|head)\s*\(\s*(?:url|req|params|query|request|input)[.[]/g, 'high', 'CWE-918'],
  ['fetch user url', /fetch\s*\(\s*(?:req|params|query|request|url)[.[]/g, 'high', 'CWE-918'],
  ['urlopen', /urlopen\s*\(\s*(?:req|params|query|request|url)[.[]/g, 'high', 'CWE-918'],
  ['axios user url', /axios[.(?:get|post|put|delete)]*\s*\(\s*(?:req|params|query|request)[.[]/g, 'high', 'CWE-918'],
  ['http.Get user url', /http\.(?:Get|Post)\s*\(\s*(?:req|params|query|r\.URL)/g, 'high', 'CWE-918'],
  ['HttpURLConnection', /new\s+URL\s*\(\s*request\./g, 'high', 'CWE-918'],
];
const ssrfFix = 'Validate URL against allowlist; block private/internal IPs (169.254.169.254, 127.0.0.1, 10.x, 192.168.x).';

const deserTemplates: Array<[string, RegExp, Severity, string, string[] | undefined]> = [
  ['pickle.load', /pickle\.loads?\s*\(/g, 'critical', 'CWE-502', ['python']],
  ['yaml.load unsafe', /yaml\.load\s*\((?![^)]*Loader\s*=\s*yaml\.SafeLoader)/g, 'critical', 'CWE-502', ['python']],
  ['marshal.loads', /marshal\.loads?\s*\(/g, 'critical', 'CWE-502', ['python']],
  ['ObjectInputStream', /new\s+ObjectInputStream\s*\(/g, 'critical', 'CWE-502', ['java']],
  ['unserialize php', /unserialize\s*\(\s*\$/g, 'critical', 'CWE-502', ['php']],
  ['Marshal.load', /Marshal\.load\s*\(/g, 'critical', 'CWE-502', ['ruby']],
];
const deserFix = 'Use safe alternatives (JSON, yaml.SafeLoader). Never deserialize untrusted data.';

const cryptoTemplates: Array<[string, RegExp, Severity, string]> = [
  ['md5', /\b(?:createHash\s*\(\s*['"]md5|hashlib\.md5|MessageDigest\.getInstance\(['"]MD5)/g, 'medium', 'CWE-328'],
  ['sha1', /\b(?:createHash\s*\(\s*['"]sha1|hashlib\.sha1|SHA1)/g, 'medium', 'CWE-328'],
  ['ecb mode', /DES_ECB|AES\.ECB|MODE_ECB|['"]ECB['"]/g, 'high', 'CWE-327'],
  ['des usage', /\bDES\b|createCipher\s*\(\s*['"]des/g, 'high', 'CWE-327'],
  ['hardcoded key', /(?:key|secret|apikey|api_key|token|password|passwd|pwd)\s*[=:]\s*["'][A-Za-z0-9+/=]{16,}["']/gi, 'critical', 'CWE-798'],
  ['ecb encrypt', /Cipher\.getInstance\s*\(\s*["']AES(?:\/ECB|")/g, 'high', 'CWE-327'],
  ['weak random', /Math\.random\s*\(\)|random\.random\s*\(\)/g, 'medium', 'CWE-338'],
  ['random for token', /(?:token|secret|key|id|session)\s*[=:]\s*[^;\n]*Math\.random/gi, 'high', 'CWE-338'],
  ['random.randint secret', /(?:token|secret|key|password)\s*[=:[\s]+random\.randint/gi, 'high', 'CWE-338'],
  ['static iv', /iv\s*[=:]\s*["'][A-Za-z0-9+/=]{8,}["']/gi, 'high', 'CWE-329'],
  ['hardcoded password', /(?:password|passwd|pwd)\s*[=:]\s*["'][^"'`{\s][^"'`]{3,}["']/gi, 'high', 'CWE-798'],
];
const cryptoFix = 'Use SHA-256+, AES-GCM with random IV, secrets module for tokens, and env vars for credentials.';

const authTemplates: Array<[string, RegExp, Severity, string]> = [
  ['empty password check', /(?:password|passwd)\s*===?\s*["']["']|if\s+not\s+password/gi, 'high', 'CWE-287'],
  ['jwt none alg', /alg['"]?\s*[=:]\s*['"](?:none|None)/g, 'critical', 'CWE-347'],
  ['jwt verify false', /jwt\.(?:verify|decode)\s*\([^)]*(?:ignoreExpiration\s*:\s*true|verify\s*:\s*false)/g, 'high', 'CWE-347'],
  ['jwt hardcoded secret', /jwt\.sign\s*\([^)]*['"][A-Za-z0-9]{8,}['"]/g, 'critical', 'CWE-798'],
  ['session no expiry', /session(?:s)?\.(?:set|put|create)\s*\([^)]*maxAge\s*[=:]\s*[-\d]{10,}/g, 'medium', 'CWE-613'],
  ['auth skip', /\/\/\s*(?:skip|bypass|no)\s+(?:auth|authentication|permission)/gi, 'high', 'CWE-862'],
  ['csrf disable', /csrf\s*[=:]\s*(?:false|disabled)/gi, 'medium', 'CWE-352'],
  ['cors wildcard', /Access-Control-Allow-Origin['"]?\s*[,:]\s*['"]\*/g, 'medium', 'CWE-942'],
  ['role client check', /if\s*\(\s*(?:user|role|isAdmin|admin)\s*===?\s*(?:true|['"]admin['"])\s*\)/gi, 'low', 'CWE-863'],
];
const authFix = 'Enforce server-side authorization, strong JWT verification, CSRF tokens, and scoped CORS.';

const xxeTemplates: Array<[string, RegExp, Severity, string]> = [
  ['xml parser external', /XMLParser\s*\(\s*(?![^)]*resolve_entities\s*=\s*False)/g, 'high', 'CWE-611'],
  ['DocumentBuilderFactory', /DocumentBuilderFactory\.newInstance/g, 'high', 'CWE-611'],
  ['etree.parse', /(?:etree|ElementTree)\.parse(?:r)?\s*\(/g, 'medium', 'CWE-611'],
  ['no xxe disable', /setFeature\s*\(\s*["']http:\/\/apache\.org\/xml\/features\/disallow-doctype-decl/g, 'low', 'CWE-611'],
];
const xxeFix = 'Disable DTD/external entities: defusedxml, setFeature disallow-doctype-decl.';

const nodeTemplates: Array<[string, RegExp, Severity, string]> = [
  ['shell option exec', /exec(?:Sync)?\s*\([^)]*\{[^}]*shell\s*:/g, 'critical', 'CWE-78'],
  ['tls reject', /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0|rejectUnauthorized\s*:\s*false/g, 'high', 'CWE-295'],
  ['helmet off', /helmet\s*\(\s*\)/g, 'low', 'CWE-693'],
  ['cookie httpOnly false', /httpOnly\s*:\s*false/g, 'medium', 'CWE-1004'],
  ['cookie secure false', /secure\s*:\s*false/g, 'medium', 'CWE-614'],
  ['prototype access', /__proto__|constructor\s*\[/g, 'high', 'CWE-1321'],
  ['child process join', /child_process[^;]*(?:exec|spawn)[^;]*(?:\+|\$\{)/g, 'critical', 'CWE-78'],
  ['temp file predictable', /(?:tmp|temp|tempfile|mktemp)[^;\n]*(?:Math\.random|Date\.now)/g, 'medium', 'CWE-377'],
  ['express static root', /express\.static\s*\(\s*['"]\/['"]/g, 'medium', 'CWE-200'],
  ['ejs render user', /res\.render\s*\(\s*[^,)]*req\./g, 'medium', 'CWE-79'],
];
const nodeFix = 'Follow Node security best practices: sandbox exec, enable TLS checks, secure cookies.';

const pyTemplates: Array<[string, RegExp, Severity, string]> = [
  ['input eval', /eval\s*\(\s*input\s*\(/g, 'critical', 'CWE-95'],
  ['tempfile mktemp', /tempfile\.mktemp\s*\(/g, 'high', 'CWE-377'],
  ['assert auth', /assert\s+(?:is_)?(?:admin|authenticated|authorized|logged_in)/gi, 'high', 'CWE-703'],
  ['except pass', /except[^:]*:\s*\n\s*pass/g, 'low', 'CWE-391'],
  ['flask debug', /app\.run\s*\([^)]*debug\s*=\s*True/g, 'high', 'CWE-489'],
  ['django debug', /DEBUG\s*=\s*True/g, 'high', 'CWE-489'],
  ['verify false', /verify\s*=\s*False/g, 'high', 'CWE-295'],
  ['redirect user', /redirect\s*\(\s*request\.(?:GET|args|POST)/g, 'medium', 'CWE-601'],
  ['sqlalchemy text', /sqlalchemy\.text\s*\(\s*f?["']/g, 'high', 'CWE-89'],
  ['jinja autoescape off', /autoescape\s*=\s*False/g, 'medium', 'CWE-79'],
  ['flask secret', /SECRET_KEY\s*=\s*["'][^"'`]{6,}["']/g, 'critical', 'CWE-798'],
];
const pyFix = 'Use safe Python idioms: no eval, secrets module, disabled debug in prod, TLS verify.';

const javaTemplates: Array<[string, RegExp, Severity, string]> = [
  ['jdbc concat', /DriverManager\.getConnection\s*\(\s*["'][^"']*\+/g, 'critical', 'CWE-89'],
  ['spring csrf off', /\.csrf\s*\(\s*\)\.disable/g, 'medium', 'CWE-352'],
  ['permitAll', /permitAll\s*\(\s*\)/g, 'medium', 'CWE-862'],
  ['spel injection', /parseExpression\s*\(\s*[^"'`]/g, 'high', 'CWE-917'],
  ['ldap injection', /(?:search|SearchControls)[^;]*\+\s*\w+\s*\+/g, 'high', 'CWE-90'],
  ['xpath concat', /XPath\s*[^;]*(?:compile|evaluate)\s*\(\s*["'][^"']*\+/g, 'high', 'CWE-643'],
];
const javaFix = 'Use PreparedStatement, keep Spring Security defaults, sanitize SpEL/LDAP/XPath inputs.';

const goTemplates: Array<[string, RegExp, Severity, string]> = [
  ['sql query concat', /db\.(?:Query|Exec)\s*\(\s*["'`][^"'`]*\+/g, 'critical', 'CWE-89'],
  ['unsafe pointer', /unsafe\.Pointer\s*\(/g, 'medium', 'CWE-704'],
  ['template html', /template\.HTML\s*\(/g, 'high', 'CWE-79'],
  ['text/template html', /html\/template/g, 'low', 'CWE-79'],
  ['command run user', /exec\.Command(?:Context)?\s*\(\s*["'`]\/bin\/(?:sh|bash)["'`]\s*,\s*["'`]-c["'`]\s*,/g, 'critical', 'CWE-78'],
];
const goFix = 'Use parameterized db queries, html/template auto-escaping, exec.Command with fixed args.';

const phpTemplates: Array<[string, RegExp, Severity, string]> = [
  ['mysql_query', /mysql_query\s*\(/g, 'critical', 'CWE-89'],
  ['include user', /(?:include|require)(?:_once)?\s*\(\s*\$/g, 'critical', 'CWE-98'],
  ['shell_exec', /(?:shell_exec|system|passthru|popen|proc_open)\s*\(/g, 'critical', 'CWE-78'],
  ['preg /e', /preg_replace\s*\(\s*["'][^"']*\/[a-z]*e[a-z]*["']/gi, 'critical', 'CWE-95'],
  ['extract', /\bextract\s*\(\s*\$/g, 'high', 'CWE-502'],
  ['register_globals', /register_globals\s*=\s*On/gi, 'high', 'CWE-665'],
  ['$_GET echo', /echo\s+\$_(?:GET|POST|REQUEST|COOKIE)/g, 'high', 'CWE-79'],
  ['move_uploaded_file user', /move_uploaded_file\s*\(\s*\$_FILES/g, 'medium', 'CWE-434'],
];
const phpFix = 'Use PDO prepared statements, escape output, never pass user input to include/exec.';

const depTemplates: Array<[string, RegExp, Severity, string]> = [
  ['curl pipe sh', /curl\s+[^|]*\|\s*(?:ba)?sh/g, 'high', 'CWE-78'],
  ['wget pipe sh', /wget\s+[^|]*\|\s*(?:ba)?sh/g, 'high', 'CWE-78'],
  ['sudo curl', /sudo\s+(?:curl|wget)/g, 'medium', 'CWE-250'],
  ['chmod 777', /chmod\s+[-R]*\s*777/g, 'medium', 'CWE-732'],
  ['docker privileged', /privileged\s*:\s*true/g, 'high', 'CWE-250'],
  ['docker latest tag', /FROM\s+\S+:latest/g, 'low', 'CWE-1104'],
  ['password in url', /:\/\/[^:/\s]+:[^@/\s]{3,}@/g, 'high', 'CWE-798'],
];
const depFix = 'Pin dependencies, avoid piping downloads to shell, least privilege for containers.';

function owaspFor(cwe?: string): string | undefined {
  const m: Record<string, string> = {
    'CWE-89': 'A03:2021 Injection',
    'CWE-79': 'A03:2021 Injection',
    'CWE-78': 'A03:2021 Injection',
    'CWE-95': 'A03:2021 Injection',
    'CWE-22': 'A01:2021 Broken Access Control',
    'CWE-918': 'A10:2021 SSRF',
    'CWE-502': 'A08:2021 Software/Data Integrity',
    'CWE-798': 'A07:2021 Identification/Auth Failures',
    'CWE-328': 'A02:2021 Cryptographic Failures',
    'CWE-327': 'A02:2021 Cryptographic Failures',
    'CWE-287': 'A07:2021 Identification/Auth Failures',
    'CWE-862': 'A01:2021 Broken Access Control',
  };
  return cwe ? m[cwe] : undefined;
}

function mk(
  langs: string[],
  tpl: ReadonlyArray<readonly [string, RegExp, Severity, string, (readonly string[] | undefined)?]>,
  category: string,
  fix: string,
  fixZh: string,
  descPrefix: string,
): SecurityRule[] {
  return tpl.map(([name, pattern, severity, cwe, overrideLangs], i) => ({
    id: `${category}-${String(i + 1).padStart(3, '0')}`,
    name: `${descPrefix}: ${name}`,
    nameZh: `${descPrefix}（${name}）`,
    severity,
    category,
    cwe,
    owasp: owaspFor(cwe),
    languages: (overrideLangs ?? langs) as string[],
    patterns: [pattern],
    description: `${descPrefix} issue detected via pattern "${name}".`,
    descriptionZh: `检测到${descPrefix}风险（模式：${name}）。`,
    fix,
    fixZh,
  }));
}

export const SECURITY_RULES: readonly SecurityRule[] = [
  ...mk(sqliLangs, sqliTemplates, 'sqli', sqliFix, '使用参数化查询/预编译语句，绝不拼接用户输入到 SQL。', 'SQL injection'),
  ...mk(['javascript', 'typescript', 'php', 'ruby', 'python'], xssTemplates, 'xss', xssFix, '使用 DOMPurify 消毒或转义输出，用 textContent 替代 innerHTML。', 'XSS'),
  ...mk(['*'], cmdiTemplates, 'cmdi', cmdiFix, '避免 shell=True/eval，使用数组参数 API，命令白名单。', 'Command injection'),
  ...mk(['*'], pathTemplates, 'path-traversal', pathFix, '规范化路径并校验前缀，不信任用户输入作为路径。', 'Path traversal'),
  ...mk(['*'], ssrfTemplates, 'ssrf', ssrfFix, '对 URL 做白名单校验，封禁内网/私有 IP。', 'SSRF'),
  ...mk(['*'], deserTemplates, 'deserialization', deserFix, '使用安全格式，绝不反序列化不可信数据。', 'Unsafe deserialization'),
  ...mk(['*'], cryptoTemplates, 'crypto', cryptoFix, '使用 SHA-256+、AES-GCM 随机 IV、secrets 模块生成令牌。', 'Crypto weakness'),
  ...mk(['*'], authTemplates, 'auth', authFix, '服务端强制鉴权、严格校验 JWT、启用 CSRF Token。', 'Auth/session flaw'),
  ...mk(['*'], xxeTemplates, 'xxe', xxeFix, '禁用 DTD/外部实体。', 'XXE'),
  ...mk(['javascript', 'typescript'], nodeTemplates, 'node', nodeFix, '遵循 Node 安全最佳实践。', 'Node.js risk'),
  ...mk(['python'], pyTemplates, 'python', pyFix, '使用安全 Python 惯用法。', 'Python risk'),
  ...mk(['java'], javaTemplates, 'java', javaFix, '遵循 Java 安全最佳实践。', 'Java risk'),
  ...mk(['go'], goTemplates, 'go', goFix, '遵循 Go 安全最佳实践。', 'Go risk'),
  ...mk(['php'], phpTemplates, 'php', phpFix, '遵循 PHP 安全最佳实践。', 'PHP risk'),
  ...mk(['*'], depTemplates, 'dependency', depFix, '锁定依赖版本，容器最小权限。', 'Dependency/config risk'),
];

export function rulesForLanguage(lang: string): readonly SecurityRule[] {
  return SECURITY_RULES.filter(r => r.languages.includes('*') || r.languages.includes(lang));
}

export function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  const m: Record<string, string> = {
    py: 'python',
    js: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    java: 'java',
    php: 'php',
    go: 'go',
    rb: 'ruby',
    kt: 'java',
    rs: 'rust',
    c: 'c',
    h: 'c',
    cpp: 'cpp',
    cc: 'cpp',
    hpp: 'cpp',
    cs: 'csharp',
    vue: 'javascript',
    svelte: 'javascript',
  };
  return m[ext] ?? 'unknown';
}
