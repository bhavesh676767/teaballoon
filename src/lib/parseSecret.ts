export interface ParsedSecretPayload {
  text: string;
  vessel: "balloon" | "airplane" | "anvil";
  doodle: string | null;
  replyTo?: string;
  audio?: string | null;
  gif?: string | null;
}

export function parseSecretPayload(msg: string): ParsedSecretPayload {
  try {
    if (msg.startsWith('{"text":')) {
      const p = JSON.parse(msg);
      // Extra safety to avoid rendering weird JSON values directly
      return {
        text: typeof p.text === 'string' ? p.text : msg,
        vessel: ['balloon', 'airplane', 'anvil'].includes(p.vessel) ? p.vessel : 'balloon',
        doodle: typeof p.doodle === 'string' && p.doodle.startsWith('data:image/') ? p.doodle : null,
        replyTo: typeof p.replyTo === 'string' ? p.replyTo : undefined,
        audio: typeof p.audio === 'string' && (p.audio.startsWith('data:audio/') || p.audio.startsWith('data:video/')) ? p.audio : null,
        gif: typeof p.gif === 'string' && (p.gif.startsWith('http') || p.gif.startsWith('https')) ? p.gif : null
      };
    }

  } catch (e) {}
  
  // Legacy / standard messages
  return {
    text: msg,
    vessel: "balloon",
    doodle: null
  };
}
