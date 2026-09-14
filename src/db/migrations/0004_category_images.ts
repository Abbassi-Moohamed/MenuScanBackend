import { migrations } from "./index.js";

migrations.push({
  name: "0004_category_images",

  async up({ db }) {
    const options = (await db.collection("itemcategories").options()) as {
      validator?: { $jsonSchema?: { properties?: Record<string, unknown> } };
    };
    const schema = options?.validator?.$jsonSchema;
    if (!schema) return;

    await db.command({
      collMod: "itemcategories",
      validator: {
        $jsonSchema: {
          ...schema,
          properties: {
            ...schema.properties,
            image: { bsonType: ["string", "null"] },
            imageId: { bsonType: ["string", "null"] },
          },
        },
      },
      validationLevel: "strict",
    });
  },

  async down({ db }) {
    const options = (await db.collection("itemcategories").options()) as {
      validator?: { $jsonSchema?: { properties?: Record<string, unknown> } };
    };
    const schema = options?.validator?.$jsonSchema;
    if (!schema) return;
    const properties = { ...schema.properties };
    delete properties.image;
    delete properties.imageId;
    await db.command({
      collMod: "itemcategories",
      validator: { $jsonSchema: { ...schema, properties } },
      validationLevel: "strict",
    });
  },
});
