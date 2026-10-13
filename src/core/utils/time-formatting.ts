/** Muestra rangos horarios almacenados en formato de 24 horas como hora civil de 12 horas. */
export function formatScheduleLabel(label?: string | null): string {
  if (!label) return '';

  return label.replace(/\b(\d{1,2}):(\d{2})\b/g, (_match, hourText: string, minuteText: string) => {
    const hour = Number(hourText);
    const minute = Number(minuteText);
    if (hour > 23 || minute > 59) return _match;

    return new Intl.DateTimeFormat('es-CO', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(new Date(2000, 0, 1, hour, minute));
  });
}
