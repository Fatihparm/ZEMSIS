const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    calculateSchema,
    calculateLayersSchema,
    registerSchema,
    loginSchema,
    projectSchema
} = require('./schemas');

describe('Zod Validation Schemas', () => {

    describe('calculateSchema', () => {
        it('should validate valid calculation parameters', () => {
            const validBody = {
                parameters: {
                    D: 0.6,
                    s: 1.6,
                    cu: 45,
                    sigmaJet: 3000,
                    Es: 10000,
                    H: 12,
                    qtemel: 120
                },
                lang: 'tr'
            };
            const parsed = calculateSchema.parse(validBody);
            assert.strictEqual(parsed.parameters.D, 0.6);
            assert.strictEqual(parsed.parameters.Fs, 2.0); // default Fs
            assert.strictEqual(parsed.lang, 'tr');
        });

        it('should throw error when required parameters like D are missing', () => {
            const invalidBody = {
                parameters: {
                    s: 1.6,
                    cu: 45,
                    sigmaJet: 3000,
                    Es: 10000,
                    H: 12,
                    qtemel: 120
                }
            };
            assert.throws(() => calculateSchema.parse(invalidBody));
        });

        it('should throw error when D is negative or zero', () => {
            const invalidBody = {
                parameters: {
                    D: -0.6,
                    s: 1.6,
                    cu: 45,
                    sigmaJet: 3000,
                    Es: 10000,
                    H: 12,
                    qtemel: 120
                }
            };
            assert.throws(() => calculateSchema.parse(invalidBody));
        });
    });

    describe('calculateLayersSchema', () => {
        it('should validate valid soil layers array', () => {
            const valid = {
                layers: [
                    { soilType: 'kum', thickness: 3, gamma: 17, phi: 35, cohesion: 5, elasticity: 30000, poisson: 0.25 }
                ]
            };
            const parsed = calculateLayersSchema.parse(valid);
            assert.strictEqual(parsed.layers.length, 1);
        });

        it('should fail when layers array is empty', () => {
            assert.throws(() => calculateLayersSchema.parse({ layers: [] }));
        });

        it('should fail when poisson ratio exceeds 0.5', () => {
            const invalid = {
                layers: [
                    { soilType: 'kum', thickness: 3, gamma: 17, phi: 35, cohesion: 5, elasticity: 30000, poisson: 0.8 }
                ]
            };
            assert.throws(() => calculateLayersSchema.parse(invalid));
        });
    });

    describe('registerSchema', () => {
        it('should validate valid user registration', () => {
            const validUser = {
                email: 'test@example.com',
                password: 'password123',
                fullName: 'Ahmet Yilmaz',
                role: 'user'
            };
            const parsed = registerSchema.parse(validUser);
            assert.strictEqual(parsed.email, 'test@example.com');
        });

        it('should fail when municipal_officer role is missing municipality', () => {
            const officerWithoutMuni = {
                email: 'officer@example.com',
                password: 'password123',
                fullName: 'Memur Ali',
                role: 'municipal_officer'
            };
            assert.throws(() => registerSchema.parse(officerWithoutMuni));
        });

        it('should pass when municipal_officer provides municipality', () => {
            const validOfficer = {
                email: 'officer@example.com',
                password: 'password123',
                fullName: 'Memur Ali',
                role: 'municipal_officer',
                municipality: 'Osmangazi Belediyesi'
            };
            const parsed = registerSchema.parse(validOfficer);
            assert.strictEqual(parsed.municipality, 'Osmangazi Belediyesi');
        });
    });

    describe('loginSchema', () => {
        it('should validate valid login credentials', () => {
            const valid = { email: 'user@test.com', password: 'secretpassword' };
            const parsed = loginSchema.parse(valid);
            assert.strictEqual(parsed.email, 'user@test.com');
        });

        it('should reject invalid email format', () => {
            assert.throws(() => loginSchema.parse({ email: 'invalid-email', password: '123' }));
        });
    });

    describe('projectSchema', () => {
        it('should validate project creation payload', () => {
            const project = {
                name: 'Bursa Jet Grout Projesi',
                description: 'Örnek açıklama',
                parameters: { D: 0.6, s: 1.6 }
            };
            const parsed = projectSchema.parse(project);
            assert.strictEqual(parsed.name, 'Bursa Jet Grout Projesi');
        });

        it('should reject when name is missing', () => {
            assert.throws(() => projectSchema.parse({ parameters: {} }));
        });
    });
});
