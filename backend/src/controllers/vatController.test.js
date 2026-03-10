const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Organization = require('../models/Organization');
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const vatRoutes = require('../routes/vat');

// Mock a partie du middleware qui nous intéresse
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, res, next) => {
    req.userId = 'user123'; // Mock user ID
    next();
  },
}));

const app = express();
app.use(express.json());
// Il faut préfixer la route comme dans le vrai index.js
const appWithRoutes = express();
appWithRoutes.use(express.json());
appWithRoutes.use('/api/vat', vatRoutes);


let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Nettoyer la DB avant chaque test
  await Organization.deleteMany({});
  await Invoice.deleteMany({});
  await Expense.deleteMany({});
});

describe('VAT Controller - /api/vat', () => {

  describe('GET /summary', () => {

    it('should calculate VAT summary correctly for a given period', async () => {
      // 1. Setup : Créer les données de test
      const org = await Organization.create({
        name: 'Test Corp',
        clerkOwnerId: 'user123',
      });

      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 15);

      // -- Factures (TVA collectée)
      await Invoice.create([
        { // Payée dans la période -> Inclus
          organizationId: org._id,
          number: 'INV-001',
          status: 'paid',
          paidAt: lastMonth,
          vatAmount: 100, // 100€
          total: 600,
          clientId: new mongoose.Types.ObjectId(),
          lines: [{ description: 'Service A', quantity: 1, unitPrice: 500, vatRate: 20 }],
        },
        { // Payée hors période -> Exclus
          organizationId: org._id,
          number: 'INV-002',
          status: 'paid',
          paidAt: new Date(today.getFullYear(), today.getMonth() - 2, 15),
          vatAmount: 50,
          total: 300,
          clientId: new mongoose.Types.ObjectId(),
        },
        { // Non payée -> Exclus
          organizationId: org._id,
          number: 'INV-003',
          status: 'sent',
          vatAmount: 20,
          total: 120,
          clientId: new mongoose.Types.ObjectId(),
        },
      ]);
      
      // -- Dépenses (TVA déductible)
      await Expense.create([
        { // Dépense de service, validée -> Inclus
          organizationId: org._id,
          description: 'Abonnement SaaS',
          status: 'validated',
          date: lastMonth,
          assetCategory: false,
          category: 'software',
          vatRecoverable: 20, // 20€
          amount: 120,
        },
        { // Dépense d'immobilisation, validée -> Inclus
          organizationId: org._id,
          description: 'Ordinateur',
          status: 'validated',
          date: lastMonth,
          assetCategory: true,
          category: 'office',
          vatRecoverable: 200, // 200€
          amount: 1200,
        },
        { // Dépense non validée -> Exclus
          organizationId: org._id,
          description: 'Restaurant',
          status: 'pending_review',
          date: lastMonth,
          assetCategory: false,
          category: 'travel',
          vatRecoverable: 5,
          amount: 55,
        },
         { // Dépense hors période -> Exclus
          organizationId: org._id,
          description: 'Ancien logiciel',
          status: 'validated',
          date: new Date(today.getFullYear(), today.getMonth() - 3, 15),
          assetCategory: false,
          category: 'software',
          vatRecoverable: 10,
          amount: 60,
        },
      ]);
      
      // 2. Action : Appeler l'endpoint
      const from = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
      const to = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);

      const response = await request(appWithRoutes)
        .get(`/api/vat/summary?from=${from.toISOString()}&to=${to.toISOString()}`);
        
      // 3. Assertions : Vérifier le résultat
      expect(response.status).toBe(200);
      
      // TVA Collectée = 100€
      expect(response.body.collectedVAT).toBe(100); 

      // TVA Déductible (services) = 20€
      expect(response.body.deductibleVAT_services).toBe(20);

      // TVA Déductible (immobilisations) = 200€
      expect(response.body.deductibleVAT_assets).toBe(200);

      // Total déductible = 220€
      expect(response.body.totalDeductibleVAT).toBe(220);

      // Solde = 100 - 220 = -120€ => 120€ de crédit
      expect(response.body.vatDue).toBe(0);
      expect(response.body.vatCredit).toBe(120);
    });

    it('should return 400 if dates are missing', async () => {
       await Organization.create({ name: 'Test Corp', clerkOwnerId: 'user123' });
       const response = await request(appWithRoutes).get('/api/vat/summary');
       expect(response.status).toBe(400);
       expect(response.body.error).toBe('Les dates de début (from) et de fin (to) sont requises.');
    });
  });
});
