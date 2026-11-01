const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const mongoose = require('mongoose');

async function main() {
  console.log('Seeding Stockroom database...');

  // 1. Clean existing records in reverse dependency order
  await prisma.stockMovement.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.category.deleteMany();

  console.log('Cleared existing database records.');

  // 2. Create Categories
  const categoriesData = [
    { name: 'Electronics & Peripherals', description: 'Input devices, monitors, audio gear, and computer peripherals' },
    { name: 'Office Furniture', description: 'Ergonomic chairs, standing desks, monitor arms, and storage units' },
    { name: 'Stationery & Paper', description: 'Notebooks, pens, paper reams, organizers, and desk accessories' },
    { name: 'Cables & Connectivity', description: 'USB-C cables, HDMI leads, power hubs, and adapters' },
    { name: 'Storage & Accessories', description: 'External hard drives, flash drives, laptop sleeves, and organizers' },
  ];

  const categories = [];
  for (const cat of categoriesData) {
    const created = await prisma.category.create({ data: cat });
    categories.push(created);
  }
  console.log(`Created ${categories.length} categories.`);

  // 3. Create Suppliers
  const suppliersData = [
    {
      name: 'Apex Peripherals Logistics',
      contactPerson: 'Rajesh Sharma',
      email: 'rajesh@apexlogistics.in',
      phone: '+91 98201 12345',
      address: 'Plot 42, Andheri East MIDC, Mumbai, MH 400093',
    },
    {
      name: 'Bharat Office Works',
      contactPerson: 'Priya Patel',
      email: 'priya@bharatofficeworks.com',
      phone: '+91 98980 54321',
      address: 'Sector 25, GIDC Industrial Estate, Gandhinagar, GJ 382024',
    },
    {
      name: 'Indus Paper & Stationery Co.',
      contactPerson: 'Vikram Malhotra',
      email: 'v.malhotra@induspaper.in',
      phone: '+91 98110 67890',
      address: 'Chawri Bazar Commercial Complex, Old Delhi, DL 110006',
    },
    {
      name: 'Zenith Tech Supplies',
      contactPerson: 'Ananya Rao',
      email: 'ananya@zenithtech.io',
      phone: '+91 99000 87654',
      address: '7th Block, Koramangala Industrial Layout, Bengaluru, KA 560095',
    },
    {
      name: 'Falcon Hardware & Cables',
      contactPerson: 'Suresh Nair',
      email: 'suresh@falconhardware.co.in',
      phone: '+91 94440 23456',
      address: 'Ambattur Industrial Estate, Chennai, TN 600058',
    },
  ];

  const suppliers = [];
  for (const supp of suppliersData) {
    const created = await prisma.supplier.create({ data: supp });
    suppliers.push(created);
  }
  console.log(`Created ${suppliers.length} suppliers.`);

  // 4. Create Products
  // Ensure mix of healthy stock, low stock (quantity <= minStockLevel), and zero stock (quantity = 0)
  const productsData = [
    // Category 0: Electronics
    {
      name: 'Dual-Mode Silent Wireless Mouse',
      sku: 'ELEC-MOU-001',
      description: '2.4GHz USB receiver plus Bluetooth 5.0 rechargeable ergonomic mouse',
      categoryId: categories[0].id,
      supplierId: suppliers[0].id,
      price: 1499.0,
      quantity: 45, // Healthy
      minStockLevel: 10,
    },
    {
      name: 'Tenkeyless Mechanical Keyboard (Brown Switches)',
      sku: 'ELEC-KEY-002',
      description: 'Compact 87-key tactile keyboard with white LED backlight',
      categoryId: categories[0].id,
      supplierId: suppliers[0].id,
      price: 3899.0,
      quantity: 3, // LOW STOCK
      minStockLevel: 8,
    },
    {
      name: '27-inch 4K IPS UHD Monitor',
      sku: 'ELEC-MON-003',
      description: 'Ultra-thin bezel, 99% sRGB color gamut with USB-C 65W power delivery',
      categoryId: categories[0].id,
      supplierId: suppliers[3].id,
      price: 24999.0,
      quantity: 2, // LOW STOCK
      minStockLevel: 4,
    },
    {
      name: 'Active Noise Cancelling Wireless Headset',
      sku: 'ELEC-AUD-004',
      description: 'Over-ear headphones with 40mm drivers and 30-hour battery life',
      categoryId: categories[0].id,
      supplierId: suppliers[3].id,
      price: 4999.0,
      quantity: 0, // ZERO STOCK
      minStockLevel: 5,
    },
    {
      name: 'Full HD 1080p Streaming Webcam with Privacy Shutter',
      sku: 'ELEC-CAM-005',
      description: 'Dual noise-reducing microphones with automatic light correction',
      categoryId: categories[0].id,
      supplierId: suppliers[0].id,
      price: 2799.0,
      quantity: 18, // Healthy
      minStockLevel: 6,
    },

    // Category 1: Office Furniture
    {
      name: 'Ergonomic High-Back Mesh Chair',
      sku: 'FURN-CHR-001',
      description: 'Breathable mesh with 3D lumbar support and multi-angle recline lock',
      categoryId: categories[1].id,
      supplierId: suppliers[1].id,
      price: 11999.0,
      quantity: 2, // LOW STOCK
      minStockLevel: 5,
    },
    {
      name: 'Dual-Motor Electric Standing Desk (140x70cm)',
      sku: 'FURN-DSK-002',
      description: 'Digital memory keypad with anti-collision sensor and cable tray',
      categoryId: categories[1].id,
      supplierId: suppliers[1].id,
      price: 22499.0,
      quantity: 6, // Healthy
      minStockLevel: 3,
    },
    {
      name: 'Heavy Duty Gas Spring Monitor Arm',
      sku: 'FURN-ARM-003',
      description: 'Single monitor desk mount supporting screens from 17 to 32 inches',
      categoryId: categories[1].id,
      supplierId: suppliers[1].id,
      price: 2199.0,
      quantity: 14, // Healthy
      minStockLevel: 5,
    },
    {
      name: 'Under-Desk Steel Pedestal Mobile File Cabinet',
      sku: 'FURN-CAB-004',
      description: '3-drawer locking cabinet with caster wheels and organizer tray',
      categoryId: categories[1].id,
      supplierId: suppliers[1].id,
      price: 5499.0,
      quantity: 4, // LOW STOCK
      minStockLevel: 5,
    },

    // Category 2: Stationery & Paper
    {
      name: 'Executive Hardcover Journal Notebook (A5, 192 Pages)',
      sku: 'STAT-NTB-001',
      description: '100gsm acid-free dotted paper with ribbon bookmark and elastic closure',
      categoryId: categories[2].id,
      supplierId: suppliers[2].id,
      price: 449.0,
      quantity: 85, // Healthy
      minStockLevel: 25,
    },
    {
      name: 'Rollerball Gel Pens 0.5mm (Pack of 12)',
      sku: 'STAT-PEN-002',
      description: 'Smooth quick-drying archival black ink pens with rubber grip',
      categoryId: categories[2].id,
      supplierId: suppliers[2].id,
      price: 360.0,
      quantity: 50, // Healthy
      minStockLevel: 20,
    },
    {
      name: 'Premium Copier Paper Ream (A4, 80gsm, 500 Sheets)',
      sku: 'STAT-PPR-003',
      description: 'High brightness multi-purpose copier paper for laser and inkjet printers',
      categoryId: categories[2].id,
      supplierId: suppliers[2].id,
      price: 349.0,
      quantity: 12, // LOW STOCK
      minStockLevel: 20,
    },
    {
      name: 'Desk Pad Protector & Mouse Mat (80x40cm)',
      sku: 'STAT-MAT-004',
      description: 'Waterproof PU leather dual-sided writing blotter and mousepad',
      categoryId: categories[2].id,
      supplierId: suppliers[2].id,
      price: 699.0,
      quantity: 28, // Healthy
      minStockLevel: 10,
    },
    {
      name: 'Self-Adhesive Sticky Notes (3x3 inch, 5 Pads)',
      sku: 'STAT-NOT-005',
      description: 'Pastel colored repositionable reminder pads 100 sheets each',
      categoryId: categories[2].id,
      supplierId: suppliers[2].id,
      price: 210.0,
      quantity: 60, // Healthy
      minStockLevel: 15,
    },

    // Category 3: Cables & Connectivity
    {
      name: 'Braided 100W USB-C to USB-C Cable (2 Metres)',
      sku: 'CABL-USC-001',
      description: 'E-marker chip fast-charging and 480Mbps data sync cable',
      categoryId: categories[3].id,
      supplierId: suppliers[4].id,
      price: 599.0,
      quantity: 65, // Healthy
      minStockLevel: 15,
    },
    {
      name: 'High-Speed HDMI 2.1 Cable 8K@60Hz (3 Metres)',
      sku: 'CABL-HDM-002',
      description: '48Gbps ultra certified braided lead with gold-plated connectors',
      categoryId: categories[3].id,
      supplierId: suppliers[4].id,
      price: 899.0,
      quantity: 32, // Healthy
      minStockLevel: 10,
    },
    {
      name: '7-in-1 Aluminum USB-C Hub with 4K HDMI & 100W PD',
      sku: 'CABL-HUB-003',
      description: 'Includes HDMI, 3x USB 3.0, SD/microSD reader, 100W Power Delivery pass-through',
      categoryId: categories[3].id,
      supplierId: suppliers[3].id,
      price: 2299.0,
      quantity: 4, // LOW STOCK
      minStockLevel: 6,
    },
    {
      name: 'Cat6 Gigabit Ethernet Patch Cable (5 Metres)',
      sku: 'CABL-ETH-004',
      description: 'Snagless RJ45 shielded twisted pair patch cord',
      categoryId: categories[3].id,
      supplierId: suppliers[4].id,
      price: 249.0,
      quantity: 40, // Healthy
      minStockLevel: 12,
    },

    // Category 4: Storage & Accessories
    {
      name: 'Ventilated Aluminum Laptop Riser Stand',
      sku: 'ACC-STD-001',
      description: 'Foldable ergonomic elevation stand with silicone anti-slip cushions',
      categoryId: categories[4].id,
      supplierId: suppliers[0].id,
      price: 1199.0,
      quantity: 0, // ZERO STOCK
      minStockLevel: 6,
    },
    {
      name: 'External Portable SSD 1TB (USB 3.2 Gen 2)',
      sku: 'ACC-SSD-002',
      description: 'Speeds up to 1050MB/s, shock-resistant aluminum casing',
      categoryId: categories[4].id,
      supplierId: suppliers[3].id,
      price: 7499.0,
      quantity: 11, // Healthy
      minStockLevel: 4,
    },
    {
      name: 'Water-Resistant Neoprene Laptop Sleeve 14-inch',
      sku: 'ACC-SLV-003',
      description: 'Shock-absorbing protective case with accessory zipper pocket',
      categoryId: categories[4].id,
      supplierId: suppliers[2].id,
      price: 799.0,
      quantity: 19, // Healthy
      minStockLevel: 8,
    },
    {
      name: 'Architect LED Desk Lamp with Clamp and Dimmer',
      sku: 'ACC-LMP-004',
      description: 'Swing-arm task light with 5 color temperatures and touch brightness',
      categoryId: categories[4].id,
      supplierId: suppliers[1].id,
      price: 2499.0,
      quantity: 8, // Healthy
      minStockLevel: 5,
    },
  ];

  const products = [];
  for (const prod of productsData) {
    const created = await prisma.product.create({ data: prod });
    products.push(created);

    // Initial stock movement
    if (prod.quantity > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: created.id,
          type: 'Stock In',
          quantity: prod.quantity,
          previousStock: 0,
          newStock: prod.quantity,
          note: 'Opening warehouse inventory balance',
        },
      });
    }
  }
  console.log(`Created ${products.length} products with initial stock movements.`);

  // 5. Create Purchase Orders
  // PO 1: RECEIVED
  const po1 = await prisma.purchaseOrder.create({
    data: {
      supplierId: suppliers[0].id,
      status: 'RECEIVED',
      totalAmount: 49470.0,
      items: {
        create: [
          { productId: products[0].id, quantity: 20, unitPrice: 1350.0, subtotal: 27000.0 },
          { productId: products[4].id, quantity: 9, unitPrice: 2496.67, subtotal: 22470.0 },
        ],
      },
    },
  });

  // PO 2: RECEIVED
  const po2 = await prisma.purchaseOrder.create({
    data: {
      supplierId: suppliers[4].id,
      status: 'RECEIVED',
      totalAmount: 26970.0,
      items: {
        create: [
          { productId: products[14].id, quantity: 30, unitPrice: 520.0, subtotal: 15600.0 },
          { productId: products[15].id, quantity: 15, unitPrice: 758.0, subtotal: 11370.0 },
        ],
      },
    },
  });

  // PO 3: PENDING (Apex Peripherals - Brown switch keyboards & Webcams)
  const po3 = await prisma.purchaseOrder.create({
    data: {
      supplierId: suppliers[0].id,
      status: 'PENDING',
      totalAmount: 51980.0,
      items: {
        create: [
          { productId: products[1].id, quantity: 10, unitPrice: 3499.0, subtotal: 34990.0 },
          { productId: products[4].id, quantity: 7, unitPrice: 2427.14, subtotal: 16990.0 },
        ],
      },
    },
  });

  // PO 4: PENDING (Zenith Tech Supplies - 4K Monitors & USB-C Hubs)
  const po4 = await prisma.purchaseOrder.create({
    data: {
      supplierId: suppliers[3].id,
      status: 'PENDING',
      totalAmount: 118490.0,
      items: {
        create: [
          { productId: products[2].id, quantity: 4, unitPrice: 22500.0, subtotal: 90000.0 },
          { productId: products[16].id, quantity: 15, unitPrice: 1899.33, subtotal: 28490.0 },
        ],
      },
    },
  });

  // PO 5: CANCELLED (Bharat Office Works - Ergonomic Chairs)
  const po5 = await prisma.purchaseOrder.create({
    data: {
      supplierId: suppliers[1].id,
      status: 'CANCELLED',
      totalAmount: 54995.0,
      items: {
        create: [
          { productId: products[5].id, quantity: 5, unitPrice: 10999.0, subtotal: 54995.0 },
        ],
      },
    },
  });

  console.log('Created 5 purchase orders (2 Received, 2 Pending, 1 Cancelled).');

  // 6. Additional stock movement records (stock out dispatch, manual adjustments)
  await prisma.stockMovement.create({
    data: {
      productId: products[0].id,
      type: 'Stock Out',
      quantity: 5,
      previousStock: 50,
      newStock: 45,
      note: 'Order fulfillment for Retail Client #402',
    },
  });

  await prisma.stockMovement.create({
    data: {
      productId: products[10].id,
      type: 'Stock Out',
      quantity: 10,
      previousStock: 60,
      newStock: 50,
      note: 'Corporate desk supply distribution',
    },
  });

  console.log('Created additional stock movement activity.');

  // 7. Seed MongoDB Activity Logs if MongoDB is reachable
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/stockroom';
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
    const ActivityLog = mongoose.model(
      'ActivityLog',
      new mongoose.Schema(
        {
          action: String,
          entityType: String,
          entityId: String,
          description: String,
          metadata: Object,
          createdAt: { type: Date, default: Date.now },
        },
        { versionKey: false }
      )
    );

    // Drop existing seed logs
    await ActivityLog.deleteMany({});

    const initialLogs = [
      {
        action: 'System Seeded',
        entityType: 'System',
        entityId: '0',
        description: 'Initialized Stockroom database with sample product catalogs, suppliers, and purchase orders.',
        metadata: { categories: categories.length, suppliers: suppliers.length, products: products.length },
      },
      {
        action: 'Purchase Order Received',
        entityType: 'PurchaseOrder',
        entityId: String(po1.id),
        description: `Marked Purchase Order #${po1.id} as RECEIVED. Added 29 units from Apex Peripherals.`,
        metadata: { orderId: po1.id, supplier: 'Apex Peripherals Logistics', total: 49470 },
      },
      {
        action: 'Purchase Order Received',
        entityType: 'PurchaseOrder',
        entityId: String(po2.id),
        description: `Marked Purchase Order #${po2.id} as RECEIVED. Added 45 units from Falcon Hardware.`,
        metadata: { orderId: po2.id, supplier: 'Falcon Hardware & Cables', total: 26970 },
      },
      {
        action: 'Stock Removed',
        entityType: 'StockMovement',
        entityId: String(products[0].id),
        description: 'Stock Out of 5 units for "Dual-Mode Silent Wireless Mouse" (SKU: ELEC-MOU-001).',
        metadata: { productId: products[0].id, quantity: 5, newStock: 45 },
      },
    ];

    await ActivityLog.insertMany(initialLogs);
    console.log('Seeded initial MongoDB Activity Logs.');
    await mongoose.disconnect();
  } catch (mongoErr) {
    console.log('Note: MongoDB not reachable for seed script. Skipping MongoDB logs (PostgreSQL seeded successfully).');
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

