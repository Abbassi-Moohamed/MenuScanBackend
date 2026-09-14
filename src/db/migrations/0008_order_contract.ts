import { migrations } from "./index.js";

migrations.push({
  name: "0008_order_contract",
  async up({ db }) {
    const orders = db.collection("orders");
    await orders.updateMany({}, [
      {
        $set: {
          status: { $cond: [{ $eq: ["$status", "CANCELLED"] }, "REJECTED", "$status"] },
          items: {
            $map: {
              input: "$items",
              as: "item",
              in: {
                itemId: "$$item.itemId",
                name: "$$item.name",
                quantity: "$$item.quantity",
                unitPrice: "$$item.unitPrice",
                subtotal: { $ifNull: ["$$item.subtotal", "$$item.lineTotal"] },
              },
            },
          },
        },
      },
      { $unset: ["customerName", "customerPhone", "notes", "statusHistory", "subtotal"] },
    ]);
  },
});
