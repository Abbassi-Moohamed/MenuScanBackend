import { migrations } from "./index.js";

migrations.push({
  name: "0006_item_availability_promotion",
  async up({ db }) {
    const options = (await db.collection("items").options()) as {
      validator?: { $jsonSchema?: { properties?: Record<string, unknown> } };
    };
    const schema = options?.validator?.$jsonSchema;
    if (!schema) return;
    await db.command({
      collMod: "items",
      validator: {
        $jsonSchema: {
          ...schema,
          properties: {
            ...schema.properties,
            promotion: { bsonType: ["double", "int", "long", "decimal", "null"] },
            isAvailable: { bsonType: "bool" },
          },
        },
      },
      validationLevel: "strict",
    });
  },
  async down({ db }) {
    const options = (await db.collection("items").options()) as {
      validator?: { $jsonSchema?: { properties?: Record<string, unknown> } };
    };
    const schema = options?.validator?.$jsonSchema;
    if (!schema) return;
    const properties = { ...schema.properties };
    delete properties.promotion;
    delete properties.isAvailable;
    await db.command({
      collMod: "items",
      validator: { $jsonSchema: { ...schema, properties } },
      validationLevel: "strict",
    });
  },
});
