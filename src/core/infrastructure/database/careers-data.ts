import { Career } from '../../types';

/**
 * Catálogo oficial de carreras de la FET.
 * ids estables; los pensums por carrera se cargan en fases posteriores.
 */
export const CAREERS: Career[] = [
  {
    id: 'car-fet-software',
    name: 'Ingeniería de Software (FET)',
    codePrefix: 'IS',
    numberOfSemesters: 10,
    isActive: true
  },
  {
    id: 'car-fet-electrical',
    name: 'Ingeniería Eléctrica',
    codePrefix: 'IE',
    numberOfSemesters: 10,
    isActive: true
  },
  {
    id: 'car-fet-sst',
    name: 'Administración de la Seguridad y Salud en el Trabajo',
    codePrefix: 'SS',
    numberOfSemesters: 10,
    isActive: true
  },
  {
    id: 'car-fet-environmental',
    name: 'Ingeniería Ambiental',
    codePrefix: 'IA',
    numberOfSemesters: 10,
    isActive: true
  },
  {
    id: 'car-fet-food',
    name: 'Ingeniería de Alimentos',
    codePrefix: 'AL',
    numberOfSemesters: 9,
    isActive: true
  }
];

export function getCareerById(id?: string): Career | undefined {
  if (!id) return undefined;
  return CAREERS.find((c) => c.id === id);
}

export function getDefaultCareer(): Career {
  return CAREERS[0];
}