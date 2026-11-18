
const FRECUENCIA_DESTINO = 16_000;

const BITS_POR_MUESTRA = 16;
const TAMANO_HEADER_WAV = 44;
const FORMATO_PCM = 1;

export async function aWavMono16k(uri: string): Promise<Blob> {
  const respuesta = await fetch(uri);
  const comprimido = await respuesta.arrayBuffer();

  const decodificado = await decodificar(comprimido);
  const muestras = await remuestrearAMono16k(decodificado);

  return armarWav(muestras);
}

async function decodificar(datos: ArrayBuffer): Promise<AudioBuffer> {
  const contexto = new AudioContext();
  try {
    return await contexto.decodeAudioData(datos);
  } finally {
    void contexto.close();
  }
}

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

function armarWav(muestras: Float32Array): Blob {
  const bytesDeDatos = muestras.length * (BITS_POR_MUESTRA / 8);
  const buffer = new ArrayBuffer(TAMANO_HEADER_WAV + bytesDeDatos);
  const vista = new DataView(buffer);
  const bytesPorSegundo = FRECUENCIA_DESTINO * (BITS_POR_MUESTRA / 8);

  escribirTexto(vista, 0, 'RIFF');
  vista.setUint32(4, TAMANO_HEADER_WAV - 8 + bytesDeDatos, true);
  escribirTexto(vista, 8, 'WAVE');

  escribirTexto(vista, 12, 'fmt ');
  vista.setUint32(16, 16, true);
  vista.setUint16(20, FORMATO_PCM, true);
  vista.setUint16(22, 1, true);
  vista.setUint32(24, FRECUENCIA_DESTINO, true);
  vista.setUint32(28, bytesPorSegundo, true);
  vista.setUint16(32, BITS_POR_MUESTRA / 8, true);
  vista.setUint16(34, BITS_POR_MUESTRA, true);

  escribirTexto(vista, 36, 'data');
  vista.setUint32(40, bytesDeDatos, true);

  let posicion = TAMANO_HEADER_WAV;
  for (const muestra of muestras) {
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
