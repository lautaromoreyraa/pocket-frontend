/**
 * Conversion del audio grabado en el navegador a WAV.
 *
 * En el celular expo-audio graba .m4a con AAC, que es el formato con el que se
 * valido a mano que el modelo transcribe bien. En web no hay forma de pedir eso:
 * MediaRecorder entrega lo que el navegador soporte, y en Chrome y Firefox eso
 * es WebM con Opus, un contenedor que la API de Gemini no acepta.
 *
 * El riesgo no es que falle: es que NO falle. Un modelo que no puede decodificar
 * el audio igual devuelve un JSON bien formado con gastos que nadie dijo (ver
 * "Gastos fabricados" en el CLAUDE.md del backend). Mandar un contenedor que el
 * proveedor no entiende es exactamente la situacion que fabrica gastos, asi que
 * el navegador convierte a WAV —PCM crudo, sin codec de por medio— antes de
 * subir.
 *
 * Todo pasa con la Web Audio API, sin dependencias: la conversion no justifica
 * meter un encoder al bundle.
 */

/** Voz: 16 kHz mono es lo que usan los modelos de habla y pesa un cuarto que 44.1 estereo. */
const FRECUENCIA_DESTINO = 16_000;

const BITS_POR_MUESTRA = 16;
const TAMANO_HEADER_WAV = 44;
const FORMATO_PCM = 1;

/**
 * Toma el uri que devuelve el grabador en web (un blob: local) y devuelve el
 * mismo audio como WAV mono de 16 kHz.
 */
export async function aWavMono16k(uri: string): Promise<Blob> {
  const respuesta = await fetch(uri);
  const comprimido = await respuesta.arrayBuffer();

  const decodificado = await decodificar(comprimido);
  const muestras = await remuestrearAMono16k(decodificado);

  return armarWav(muestras);
}

/**
 * decodeAudioData resuelve el contenedor sea cual sea (WebM, MP4, OGG): el
 * navegador ya tiene los decoders, y de ahi sale PCM sin comprimir.
 */
async function decodificar(datos: ArrayBuffer): Promise<AudioBuffer> {
  const contexto = new AudioContext();
  try {
    return await contexto.decodeAudioData(datos);
  } finally {
    // Cada AudioContext toma un recurso de audio del sistema y los navegadores
    // limitan cuantos puede haber vivos a la vez. Sin cerrarlo, grabar varias
    // veces seguidas termina fallando.
    void contexto.close();
  }
}

/**
 * Mezcla a un canal y baja la frecuencia en un solo paso.
 *
 * OfflineAudioContext hace el remuestreo con el mismo codigo que el navegador
 * usa para reproducir; tomar una muestra cada N a mano seria mas corto y sonaria
 * peor, y lo que suena peor se transcribe peor.
 */
async function remuestrearAMono16k(fuente: AudioBuffer): Promise<Float32Array> {
  const cuadrosDestino = Math.ceil(fuente.duration * FRECUENCIA_DESTINO);

  const offline = new OfflineAudioContext(1, cuadrosDestino, FRECUENCIA_DESTINO);
  const nodo = offline.createBufferSource();
  nodo.buffer = fuente;
  nodo.connect(offline.destination);
  nodo.start();

  const resultado = await offline.startRendering();
  return resultado.getChannelData(0);
}

/** Header RIFF de 44 bytes y las muestras convertidas a enteros de 16 bits. */
function armarWav(muestras: Float32Array): Blob {
  const bytesDeDatos = muestras.length * (BITS_POR_MUESTRA / 8);
  const buffer = new ArrayBuffer(TAMANO_HEADER_WAV + bytesDeDatos);
  const vista = new DataView(buffer);
  const bytesPorSegundo = FRECUENCIA_DESTINO * (BITS_POR_MUESTRA / 8);

  escribirTexto(vista, 0, 'RIFF');
  vista.setUint32(4, TAMANO_HEADER_WAV - 8 + bytesDeDatos, true);
  escribirTexto(vista, 8, 'WAVE');

  escribirTexto(vista, 12, 'fmt ');
  vista.setUint32(16, 16, true); // largo del bloque fmt
  vista.setUint16(20, FORMATO_PCM, true);
  vista.setUint16(22, 1, true); // canales
  vista.setUint32(24, FRECUENCIA_DESTINO, true);
  vista.setUint32(28, bytesPorSegundo, true);
  vista.setUint16(32, BITS_POR_MUESTRA / 8, true); // alineacion de bloque
  vista.setUint16(34, BITS_POR_MUESTRA, true);

  escribirTexto(vista, 36, 'data');
  vista.setUint32(40, bytesDeDatos, true);

  let posicion = TAMANO_HEADER_WAV;
  for (const muestra of muestras) {
    // El pico de un Float32Array puede pasarse de 1 y al convertirlo daria la
    // vuelta, que se escucha como un chasquido. Se recorta antes de escalar.
    const acotada = Math.max(-1, Math.min(1, muestra));
    vista.setInt16(posicion, acotada < 0 ? acotada * 0x8000 : acotada * 0x7fff, true);
    posicion += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function escribirTexto(vista: DataView, posicion: number, texto: string): void {
  for (let i = 0; i < texto.length; i++) {
    vista.setUint8(posicion + i, texto.charCodeAt(i));
  }
}
