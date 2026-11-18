import { Categoria } from '../types';

export interface CategoriaUI extends Categoria {
  nombreCorto: string;
}

export const CATEGORIAS: CategoriaUI[] = [
  { id: 1, nombre: 'Supermercado', nombreCorto: 'Supermercado', icono: null, color: null, orden: 1 },
  { id: 2, nombre: 'Delivery/Restaurantes', nombreCorto: 'Delivery', icono: null, color: null, orden: 2 },
  { id: 3, nombre: 'Transporte', nombreCorto: 'Transporte', icono: null, color: null, orden: 3 },
  { id: 4, nombre: 'Combustible', nombreCorto: 'Combustible', icono: null, color: null, orden: 4 },
  { id: 5, nombre: 'Servicios', nombreCorto: 'Servicios', icono: null, color: null, orden: 5 },
  { id: 6, nombre: 'Suscripciones', nombreCorto: 'Suscripciones', icono: null, color: null, orden: 6 },
  { id: 7, nombre: 'Salud/Farmacia', nombreCorto: 'Salud', icono: null, color: null, orden: 7 },
  { id: 8, nombre: 'Entretenimiento', nombreCorto: 'Entretenimiento', icono: null, color: null, orden: 8 },
  { id: 9, nombre: 'Ropa/Indumentaria', nombreCorto: 'Ropa', icono: null, color: null, orden: 9 },
  { id: 10, nombre: 'Hogar', nombreCorto: 'Hogar', icono: null, color: null, orden: 10 },
  { id: 11, nombre: 'Educación', nombreCorto: 'Educación', icono: null, color: null, orden: 11 },
  { id: 12, nombre: 'Mascotas', nombreCorto: 'Mascotas', icono: null, color: null, orden: 12 },
  { id: 13, nombre: 'Otros', nombreCorto: 'Otros', icono: null, color: null, orden: 13 },
];

export function categoriaPorId(id: number | null): CategoriaUI | undefined {
  return CATEGORIAS.find((c) => c.id === id);
}

export function nombreCategoria(id: number | null): string {
  return categoriaPorId(id)?.nombreCorto ?? 'Otros';
}

export const CATEGORIA_OTROS = CATEGORIAS[CATEGORIAS.length - 1];
