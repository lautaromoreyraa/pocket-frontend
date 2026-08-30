import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GastoBorrador } from '../types';
import { Boton } from '../components/controls';
import { Chip } from '../components/primitives';
import { IconPencil } from '../components/Icons';
import { Sheet } from './Sheet';
import { colors, fonts, tracking } from '../theme';
import { nombreCategoria } from '../data/categorias';
import { useMoneda } from '../context/MonedaContext';

/**
 * `#sheet` del mockup — RF-06 y RF-07.
 *
 * Muestra los N gastos que detecto la IA y permite editar cada uno antes de
 * guardar. Nada se persiste hasta que el usuario toque "Guardar" (RF-08).
 */
export function ConfirmacionAudioSheet({
  visible,
  gastos,
  onEditar,
  onDescartar,
  onGuardar,
  guardando = false,
}: {
  visible: boolean;
  gastos: GastoBorrador[];
  onEditar: (localId: string) => void;
  onDescartar: () => void;
  onGuardar: () => void;
  guardando?: boolean;
}) {
  const { format } = useMoneda();
  const cantidad = gastos.length;

  return (
    <Sheet visible={visible} onCerrar={onDescartar}>
      <Text style={s.titulo}>
        {cantidad === 1 ? 'Escuché un gasto' : `Escuché ${enLetras(cantidad)} gastos`}
      </Text>
      <Text style={s.bajada}>Revisalos y corregí lo que haga falta.</Text>

      <ScrollView style={s.lista} showsVerticalScrollIndicator={false}>
        {gastos.map((g) => (
          <View key={g.localId} style={s.det}>
            <View style={s.detTop}>
              <Text style={s.monto}>{g.monto !== null ? format(g.monto) : '—'}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Editar ${g.descripcion}`}
                onPress={() => onEditar(g.localId)}
                hitSlop={10}
                style={({ pressed }) => pressed && { opacity: 0.6 }}
              >
                <IconPencil size={15} color={colors.faint} />
              </Pressable>
            </View>
            <View style={s.chips}>
              <Chip>{nombreCategoria(g.categoriaId).toUpperCase()}</Chip>
              {g.descripcion ? <Chip>{g.descripcion.toUpperCase()}</Chip> : null}
              <Chip>{g.medioPago}</Chip>
              {g.medioPago === 'CREDITO' && g.cantidadCuotas > 1 ? (
                <Chip>{g.cantidadCuotas} CUOTAS</Chip>
              ) : null}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={s.acts}>
        <Boton titulo="Descartar" ghost flex={false} onPress={onDescartar} />
        <Boton
          titulo={cantidad === 1 ? 'Guardar' : `Guardar los ${cantidad}`}
          onPress={onGuardar}
          disabled={guardando || cantidad === 0}
        />
      </View>
    </Sheet>
  );
}

/** "Escuché dos gastos" suena mejor que "Escuché 2 gastos" */
function enLetras(n: number): string {
  const palabras = ['cero', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  return palabras[n] ?? String(n);
}

const s = StyleSheet.create({
  titulo: {
    fontFamily: fonts.chivo,
    fontSize: 21,
    letterSpacing: tracking(21, -0.03),
    color: colors.bone,
    marginBottom: 5,
  },
  bajada: { fontFamily: fonts.archivo, fontSize: 12.5, color: colors.dim, marginBottom: 18 },
  lista: { maxHeight: 340 },
  det: {
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
    paddingVertical: 14,
  },
  detTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  monto: {
    fontFamily: fonts.chivo,
    fontSize: 21,
    letterSpacing: tracking(21, -0.035),
    color: colors.bone,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  acts: { flexDirection: 'row', gap: 9, marginTop: 20 },
});
