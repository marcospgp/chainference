import * as anchor from "@coral-xyz/anchor";
import fs from "fs";

type Model = {
  id: string;
  price: anchor.BN;
};

export function loadModels(filePath: string): Model[] {
  const rawData = fs.readFileSync(filePath, "utf8");
  const models = JSON.parse(rawData);

  if (!Array.isArray(models)) {
    throw new Error("Expected an array of models.");
  }

  models.forEach((model) => {
    if (
      typeof model !== "object" ||
      model === null ||
      typeof (model as any).id !== "string" ||
      typeof (model as any).price !== "string"
    ) {
      throw new Error(`Invalid model:\n${JSON.stringify(model, null, 4)}`);
    }
  });

  return models.map((m) => ({ id: m.id, price: new anchor.BN(m.price) }));
}
