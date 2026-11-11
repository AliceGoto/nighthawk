for (const key of Object.keys(process.env)) {
  if (key.startsWith('NIGHTHAWK_')) {
    delete process.env[key];
  }
}

process.env['NIGHTHAWK_PERSISTENCE_MINIDB_READMODEL'] = 'false';
