export function toNumber(value: string | number) {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numberValue)) {
    throw new Error("Invalid number value");
  }

  return numberValue;
}
