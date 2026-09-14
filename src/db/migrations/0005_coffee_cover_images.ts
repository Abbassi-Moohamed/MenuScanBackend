import { migrations } from "./index.js";

migrations.push({
  name: "0005_coffee_cover_images",
  async up({ db }) {
    const options = (await db.collection("coffees").options()) as {
      validator?: { $jsonSchema?: { properties?: Record<string, unknown> } };
    };
    const schema = options?.validator?.$jsonSchema;
    if (!schema) return;
    await db.command({
      collMod: "coffees",
      validator: {
        $jsonSchema: {
          ...schema,
          properties: {
            ...schema.properties,
            cover: { bsonType: ["string", "null"] },
            coverImageId: { bsonType: ["string", "null"] },
          },
        },
      },
      validationLevel: "strict",
    });
  },
  async down({ db }) {
    const options = (await db.collection("coffees").options()) as {
      validator?: { $jsonSchema?: { properties?: Record<string, unknown> } };
    };
    const schema = options?.validator?.$jsonSchema;
    if (!schema) return;
    const properties = { ...schema.properties };
    delete properties.cover;
    delete properties.coverImageId;
    await db.command({
      collMod: "coffees",
      validator: { $jsonSchema: { ...schema, properties } },
      validationLevel: "strict",
    });
  },
});
