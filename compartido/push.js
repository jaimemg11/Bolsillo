// Envío de notificaciones Web Push sin librerías (solo WebCrypto): cifrado aes128gcm (RFC 8291) y firma VAPID (RFC 8292).
// Lo usan la API (aviso de prueba) y el programa diario de avisos.
const enc = new TextEncoder();
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const deB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const unir = (...partes) => { const t = new Uint8Array(partes.reduce((s, p) => s + p.length, 0)); let o = 0; for (const p of partes) { t.set(p, o); o += p.length; } return t; };

async function hkdf(salt, ikm, info, bytes) {
  const clave = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, clave, bytes * 8));
}

// Cifra el mensaje para una suscripción concreta (sus claves p256dh y auth)
export async function cifrar(texto, p256dh, auth) {
  const uaPublica = deB64url(p256dh), secreto = deB64url(auth);
  const efimera = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublica = new Uint8Array(await crypto.subtle.exportKey("raw", efimera.publicKey));
  const uaClave = await crypto.subtle.importKey("raw", uaPublica, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const compartido = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaClave }, efimera.privateKey, 256));
  const ikm = await hkdf(secreto, compartido, unir(enc.encode("WebPush: info\0"), uaPublica, asPublica), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const clave = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, clave, unir(enc.encode(texto), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]); // tamaño de registro 4096
  return unir(salt, rs, new Uint8Array([asPublica.length]), asPublica, cifrado);
}

// Firma VAPID: demuestra al servicio de push (Apple, Google, Mozilla) que el aviso viene de Bolsillo
async function cabeceraVapid(endpoint, publica, privadaJwk, contacto) {
  const cabecera = b64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const datos = b64url(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: contacto })));
  const clave = await crypto.subtle.importKey("jwk", privadaJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const firma = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, clave, enc.encode(`${cabecera}.${datos}`));
  return `vapid t=${cabecera}.${datos}.${b64url(firma)}, k=${publica}`;
}

// Manda un aviso. Devuelve el código HTTP del servicio de push: 201 = enviado; 404/410 = esa suscripción ya no existe (hay que borrarla)
export async function enviarPush(sus, mensaje, env) {
  const cuerpo = await cifrar(JSON.stringify(mensaje), sus.p256dh, sus.auth);
  const r = await fetch(sus.endpoint, {
    method: "POST",
    headers: { "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: "43200", Urgency: "normal",
      Authorization: await cabeceraVapid(sus.endpoint, env.VAPID_PUBLICA, JSON.parse(env.VAPID_PRIVADA), env.VAPID_CONTACTO || "https://bolsillo-app-9tz.pages.dev") },
    body: cuerpo,
  });
  return r.status;
}
