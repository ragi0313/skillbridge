export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Start the SessionMonitorService for background session monitoring
    console.log('[INSTRUMENTATION] Starting server services...')
    const { initializeServer } = await import('./lib/server-init')
    await initializeServer()
    console.log('[INSTRUMENTATION] Server services started')
  }
}