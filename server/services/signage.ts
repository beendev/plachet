const normalizeNullableText = (value: unknown) => {
  if (value == null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
};

const normalizeNullableNumber = (value: unknown) => {
  if (value == null) return null;
  const text = String(value).trim();
  if (text === "") return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
};

export const normalizeSignagePayload = (payload: Record<string, unknown>) => ({
  category: normalizeNullableText(payload.category),
  mount_type: normalizeNullableText(payload.mount_type),
  width: normalizeNullableNumber(payload.width),
  height: normalizeNullableNumber(payload.height),
  color_bg: normalizeNullableText(payload.color_bg),
  color_text: normalizeNullableText(payload.color_text),
  font: normalizeNullableText(payload.font),
  font_size: normalizeNullableNumber(payload.font_size),
  location_detail: normalizeNullableText(payload.location_detail),
  notes: normalizeNullableText(payload.notes),
  material: normalizeNullableText(payload.material),
  thickness: normalizeNullableText(payload.thickness),
  shape: normalizeNullableText(payload.shape),
  corners: normalizeNullableText(payload.corners),
  marking_method: normalizeNullableText(payload.marking_method),
});
