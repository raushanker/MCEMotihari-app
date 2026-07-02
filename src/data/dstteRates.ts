export type ConsultancyTest = {
  id: string;
  name: string;
  charge: string;
};

export type ConsultancyCategory = {
  id: string;
  name: string;
  tests: ConsultancyTest[];
};

export type ConsultancyLaboratory = {
  id: string;
  name: string;
  categories: ConsultancyCategory[];
};

export const DSTTE_RATES: ConsultancyLaboratory[] = [
  {
    id: 'lab-1',
    name: 'Soil Mechanics Laboratory',
    categories: [
      {
        id: 'cat-1-1',
        name: 'Classification Tests',
        tests: [
          { id: 'test-1-1-1', name: 'Sieve Analysis (Dry)', charge: '₹500' },
          { id: 'test-1-1-2', name: 'Sieve Analysis (Wet)', charge: '₹750' },
          { id: 'test-1-1-3', name: 'Hydrometer Analysis', charge: '₹1500' },
          { id: 'test-1-1-4', name: 'Plastic Limit', charge: '₹400' },
          { id: 'test-1-1-5', name: 'Liquid Limit', charge: '₹400' },
          { id: 'test-1-1-6', name: 'Shrinkage Limit', charge: '₹500' },
          { id: 'test-1-1-7', name: 'PI Value', charge: '₹1250' },
          { id: 'test-1-1-8', name: 'Moisture Content', charge: '₹375' },
          { id: 'test-1-1-9', name: 'Classification of Soil', charge: '₹3000' },
          { id: 'test-1-1-10', name: 'Cu & Cc', charge: '₹2500' },
          { id: 'test-1-1-11', name: 'Specific Gravity', charge: '₹900' },
          { id: 'test-1-1-12', name: 'Fineness Modulus', charge: '₹750' }
        ]
      },
      {
        id: 'cat-1-2',
        name: 'Density & Compaction',
        tests: [
          { id: 'test-1-2-1', name: 'Bulk Density', charge: '₹700' },
          { id: 'test-1-2-2', name: 'Dry Density', charge: '₹750' },
          { id: 'test-1-2-3', name: 'Void Ratio', charge: '₹500' },
          { id: 'test-1-2-4', name: 'Porosity', charge: '₹500' },
          { id: 'test-1-2-5', name: 'Relative Density', charge: '₹2500' },
          { id: 'test-1-2-6', name: 'Standard Proctor (MDD)', charge: '₹1250' },
          { id: 'test-1-2-7', name: 'Heavy Proctor', charge: '₹1500' },
          { id: 'test-1-2-8', name: 'Maximum Dry Density & Minimum Dry Density', charge: '₹2000' }
        ]
      },
      {
        id: 'cat-1-3',
        name: 'Strength Tests',
        tests: [
          { id: 'test-1-3-1', name: 'Direct Shear', charge: '₹1700' },
          { id: 'test-1-3-2', name: 'Unconfined Compression (Undisturbed)', charge: '₹1700' },
          { id: 'test-1-3-3', name: 'Unconfined Compression (Remoulded)', charge: '₹3000' },
          { id: 'test-1-3-4', name: 'Triaxial Compression Test (Undrained)', charge: '₹2500' },
          { id: 'test-1-3-5', name: 'Triaxial Compression Test (Drained with Bore Pressure)', charge: '₹3000' },
          { id: 'test-1-3-6', name: 'Triaxial Compression (Proctor Sample)', charge: '₹3000' },
          { id: 'test-1-3-7', name: 'Vane Shear Test', charge: '₹1000' }
        ]
      },
      {
        id: 'cat-1-4',
        name: 'Hydraulic Tests',
        tests: [
          { id: 'test-1-4-1', name: 'Permeability', charge: '₹2000' },
          { id: 'test-1-4-2', name: 'Consolidation', charge: '₹12000' },
          { id: 'test-1-4-3', name: 'Swelling Index', charge: '₹500' }
        ]
      },
      {
        id: 'cat-1-5',
        name: 'Bearing & Field Tests',
        tests: [
          { id: 'test-1-5-1', name: 'CBR Test (Unsoaked)', charge: '₹1250' },
          { id: 'test-1-5-2', name: 'Field Density', charge: '₹1300' },
          { id: 'test-1-5-3', name: 'Plate Load Test', charge: '₹40000' }
        ]
      }
    ]
  },
  {
    id: 'lab-2',
    name: 'Concrete Laboratory',
    categories: [
      {
        id: 'cat-2-1',
        name: 'Cement Tests',
        tests: [
          { id: 'test-2-1-1', name: 'Standard Consistency', charge: '₹500' },
          { id: 'test-2-1-2', name: 'Fineness', charge: '₹300' },
          { id: 'test-2-1-3', name: 'Initial Setting Time', charge: '₹300' },
          { id: 'test-2-1-4', name: 'Final Setting Time', charge: '₹375' },
          { id: 'test-2-1-5', name: 'Compressive Strength (3 Days)', charge: '₹350' },
          { id: 'test-2-1-6', name: 'Compressive Strength (7 Days)', charge: '₹500' },
          { id: 'test-2-1-7', name: 'Compressive Strength (28 Days)', charge: '₹750' },
          { id: 'test-2-1-8', name: 'Soundness', charge: '₹800' },
          { id: 'test-2-1-9', name: 'Specific Gravity', charge: '₹375' },
          { id: 'test-2-1-10', name: 'Tensile Strength', charge: '₹500' },
          { id: 'test-2-1-11', name: 'Bulk Density', charge: '₹300' }
        ]
      },
      {
        id: 'cat-2-2',
        name: 'Brick Tests',
        tests: [
          { id: 'test-2-2-1', name: 'Compressive Strength', charge: '₹1470' },
          { id: 'test-2-2-2', name: 'Water Absorption', charge: '₹530' },
          { id: 'test-2-2-3', name: 'Dimension', charge: '₹200' },
          { id: 'test-2-2-4', name: 'Unit Weight', charge: '₹100' },
          { id: 'test-2-2-5', name: 'Efflorescence', charge: '₹460' },
          { id: 'test-2-2-6', name: 'Warpage', charge: '₹125' }
        ]
      },
      {
        id: 'cat-2-3',
        name: 'Concrete Cube Tests',
        tests: [
          { id: 'test-2-3-1', name: 'Compressive Strength', charge: '₹450' },
          { id: 'test-2-3-2', name: 'Beam Test', charge: '₹600' },
          { id: 'test-2-3-3', name: 'Core Compression Test', charge: '₹2000' }
        ]
      },
      {
        id: 'cat-2-4',
        name: 'Sand Tests',
        tests: [
          { id: 'test-2-4-1', name: 'Sieve Analysis', charge: '₹500' },
          { id: 'test-2-4-2', name: 'Water Absorption', charge: '₹250' },
          { id: 'test-2-4-3', name: 'Fineness Modulus', charge: '₹250' },
          { id: 'test-2-4-4', name: 'Silt Content', charge: '₹250' },
          { id: 'test-2-4-5', name: 'Deleterious Material', charge: '₹250' },
          { id: 'test-2-4-6', name: 'Specific Gravity', charge: '₹520' },
          { id: 'test-2-4-7', name: 'Moisture Content', charge: '₹250' },
          { id: 'test-2-4-8', name: 'Bulk Density', charge: '₹250' },
          { id: 'test-2-4-9', name: 'Bulking Test', charge: '₹300' }
        ]
      },
      {
        id: 'cat-2-5',
        name: 'Aggregate Tests',
        tests: [
          { id: 'test-2-5-1', name: 'Impact Value', charge: '₹1200' },
          { id: 'test-2-5-2', name: 'Crushing Value', charge: '₹1600' },
          { id: 'test-2-5-3', name: '10% Fine Value', charge: '₹300' },
          { id: 'test-2-5-4', name: 'Sieve Analysis', charge: '₹500' },
          { id: 'test-2-5-5', name: 'Los Angeles Abrasion', charge: '₹1300' },
          { id: 'test-2-5-6', name: 'Water Absorption', charge: '₹300' },
          { id: 'test-2-5-7', name: 'Flakiness Index', charge: '₹400' },
          { id: 'test-2-5-8', name: 'Elongation Index', charge: '₹400' },
          { id: 'test-2-5-9', name: 'Specific Gravity', charge: '₹520' },
          { id: 'test-2-5-10', name: 'Moisture Content', charge: '₹375' },
          { id: 'test-2-5-11', name: 'Deleterious Material', charge: '₹375' },
          { id: 'test-2-5-12', name: 'Soundness', charge: '₹1000' }
        ]
      },
      {
        id: 'cat-2-6',
        name: 'Paver Block Tests',
        tests: [
          { id: 'test-2-6-1', name: 'Compressive Strength', charge: '₹1470' },
          { id: 'test-2-6-2', name: 'Water Absorption', charge: '₹530' },
          { id: 'test-2-6-3', name: 'Dimension', charge: '₹200' },
          { id: 'test-2-6-4', name: 'Aspect Ratio', charge: '₹200' },
          { id: 'test-2-6-5', name: 'Abrasion Resistance', charge: '₹500' },
          { id: 'test-2-6-6', name: 'Freeze Thaw Durability', charge: '₹600' },
          { id: 'test-2-6-7', name: 'Tensile Splitting Strength', charge: '₹600' },
          { id: 'test-2-6-8', name: 'Flexural Strength', charge: '₹600' }
        ]
      },
      {
        id: 'cat-2-7',
        name: 'Concrete Mix Design',
        tests: [
          { id: 'test-2-7-1', name: 'M15', charge: '₹11000' },
          { id: 'test-2-7-2', name: 'M20', charge: '₹13000' },
          { id: 'test-2-7-3', name: 'M25', charge: '₹13000' },
          { id: 'test-2-7-4', name: 'M30', charge: '₹16000' },
          { id: 'test-2-7-5', name: 'M35', charge: '₹16000' },
          { id: 'test-2-7-6', name: 'M40', charge: '₹19000' },
          { id: 'test-2-7-7', name: 'M45', charge: '₹27000' },
          { id: 'test-2-7-8', name: 'DLC', charge: '₹17000' },
          { id: 'test-2-7-9', name: 'PQC', charge: '₹20000' }
        ]
      },
      {
        id: 'cat-2-8',
        name: 'Stone Glazing & Floor Tiles',
        tests: [
          { id: 'test-2-8-1', name: 'Glazing Test', charge: '₹500' },
          { id: 'test-2-8-2', name: 'Impact Test', charge: '₹500' },
          { id: 'test-2-8-3', name: 'Moisture Content', charge: '₹350' },
          { id: 'test-2-8-4', name: 'Dimension', charge: '₹200' },
          { id: 'test-2-8-5', name: 'Transverse Strength (Wet)', charge: '₹450' },
          { id: 'test-2-8-6', name: 'Transverse Strength (Dry)', charge: '₹450' },
          { id: 'test-2-8-7', name: 'Wearing Layer', charge: '₹500' },
          { id: 'test-2-8-8', name: 'General Quality', charge: '₹400' },
          { id: 'test-2-8-9', name: 'Wear & Abrasion', charge: '₹750' },
          { id: 'test-2-8-10', name: 'Water Absorption', charge: '₹400' },
          { id: 'test-2-8-11', name: 'Warpage', charge: '₹400' }
        ]
      }
    ]
  },
  {
    id: 'lab-3',
    name: 'Transportation Laboratory',
    categories: [
      {
        id: 'cat-3-1',
        name: 'Bitumen Tests',
        tests: [
          { id: 'test-3-1-1', name: 'Penetration', charge: '₹1000' },
          { id: 'test-3-1-2', name: 'Specific Gravity', charge: '₹1000' },
          { id: 'test-3-1-3', name: 'Ductility', charge: '₹1500' },
          { id: 'test-3-1-4', name: 'Softening Point', charge: '₹1000' },
          { id: 'test-3-1-5', name: 'Viscosity', charge: '₹1500' },
          { id: 'test-3-1-6', name: 'Bitumen Stripping', charge: '₹1600' },
          { id: 'test-3-1-7', name: 'Bitumen Content', charge: '₹3000' },
          { id: 'test-3-1-8', name: 'Water Content', charge: '₹1600' },
          { id: 'test-3-1-9', name: 'Solubility', charge: '₹1500' },
          { id: 'test-3-1-10', name: 'PMC Seal Coat', charge: '₹1500' },
          { id: 'test-3-1-11', name: 'BM Seal Coat', charge: '₹1500' }
        ]
      },
      {
        id: 'cat-3-2',
        name: 'Emulsion Tests',
        tests: [
          { id: 'test-3-2-1', name: 'Viscosity', charge: '₹1000' },
          { id: 'test-3-2-2', name: 'Water Absorption', charge: '₹1000' },
          { id: 'test-3-2-3', name: 'Settlement', charge: '₹750' },
          { id: 'test-3-2-4', name: 'Sieve Test', charge: '₹750' },
          { id: 'test-3-2-5', name: 'Miscibility', charge: '₹800' },
          { id: 'test-3-2-6', name: 'Cement Mixing', charge: '₹750' },
          { id: 'test-3-2-7', name: 'Demulsibility', charge: '₹750' }
        ]
      },
      {
        id: 'cat-3-3',
        name: 'Bitumen Mix Design',
        tests: [
          { id: 'test-3-3-1', name: 'Bitumen Mix Design', charge: '₹30000' },
          { id: 'test-3-3-2', name: 'DLC', charge: '₹16000' },
          { id: 'test-3-3-3', name: 'PQC', charge: '₹20000' }
        ]
      },
      {
        id: 'cat-3-4',
        name: 'Aggregate Tests',
        tests: [
          { id: 'test-3-4-1', name: 'Impact Value', charge: '₹1200' },
          { id: 'test-3-4-2', name: 'Crushing Value', charge: '₹1600' },
          { id: 'test-3-4-3', name: '10% Fine Value', charge: '₹300' },
          { id: 'test-3-4-4', name: 'Sieve Analysis', charge: '₹500' },
          { id: 'test-3-4-5', name: 'Los Angeles Abrasion', charge: '₹1300' },
          { id: 'test-3-4-6', name: 'Water Absorption', charge: '₹300' },
          { id: 'test-3-4-7', name: 'Flakiness Index', charge: '₹400' },
          { id: 'test-3-4-8', name: 'Elongation Index', charge: '₹400' },
          { id: 'test-3-4-9', name: 'Specific Gravity', charge: '₹520' },
          { id: 'test-3-4-10', name: 'Moisture Content', charge: '₹375' },
          { id: 'test-3-4-11', name: 'Deleterious Material', charge: '₹375' },
          { id: 'test-3-4-12', name: 'Soundness', charge: '₹1000' }
        ]
      }
    ]
  },
  {
    id: 'lab-4',
    name: 'Mechanics of Solids Laboratory',
    categories: [
      {
        id: 'cat-4-1',
        name: 'Material Testing',
        tests: [
          { id: 'test-4-1-1', name: 'Nominal Mass', charge: '₹500' },
          { id: 'test-4-1-2', name: 'Dimension', charge: '₹150' },
          { id: 'test-4-1-3', name: 'Unit Weight', charge: '₹200' },
          { id: 'test-4-1-4', name: 'Ultimate Strength', charge: '₹500' },
          { id: 'test-4-1-5', name: 'Yield Strength', charge: '₹500' },
          { id: 'test-4-1-6', name: 'Elongation', charge: '₹300' },
          { id: 'test-4-1-7', name: 'Cold Bend', charge: '₹400' },
          { id: 'test-4-1-8', name: 'Cutting Charge', charge: '₹200' },
          { id: 'test-4-1-9', name: 'Re Bend', charge: '₹600' },
          { id: 'test-4-1-10', name: 'Reduction in Area', charge: '₹150' },
          { id: 'test-4-1-11', name: 'Grade Designation', charge: '₹600' },
          { id: 'test-4-1-12', name: 'Transverse Test', charge: '₹400' },
          { id: 'test-4-1-13', name: 'Impact Test', charge: '₹400' },
          { id: 'test-4-1-14', name: 'Compression Test', charge: '₹400' },
          { id: 'test-4-1-15', name: 'Hardness Test', charge: '₹400' },
          { id: 'test-4-1-16', name: 'Dump Test', charge: '₹400' },
          { id: 'test-4-1-17', name: 'Proof Load Test', charge: '₹400' },
          { id: 'test-4-1-18', name: 'Fatigue Test', charge: '₹1500' },
          { id: 'test-4-1-19', name: 'Hydraulic Jack Calibration', charge: '₹2500' },
          { id: 'test-4-1-20', name: 'High Tension Wire Test', charge: '₹1200' }
        ]
      }
    ]
  },
  {
    id: 'lab-5',
    name: 'Non Destructive Testing Laboratory',
    categories: [
      {
        id: 'cat-5-1',
        name: 'NDT Tests',
        tests: [
          { id: 'test-5-1-1', name: 'Ultrasonic Pulse Velocity', charge: '₹2000 per point' },
          { id: 'test-5-1-2', name: 'Rebound Hammer', charge: '₹1000 per point' },
          { id: 'test-5-1-3', name: 'Technical Vetting', charge: '1% of Project Cost' }
        ]
      }
    ]
  },
  {
    id: 'lab-6',
    name: 'Environmental Engineering Laboratory',
    categories: [
      {
        id: 'cat-6-1',
        name: 'Water Quality Tests',
        tests: [
          { id: 'test-6-1-1', name: 'Temperature', charge: '₹450' },
          { id: 'test-6-1-2', name: 'Colour', charge: '₹375' },
          { id: 'test-6-1-3', name: 'Turbidity', charge: '₹375' },
          { id: 'test-6-1-4', name: 'Conductivity', charge: '₹375' },
          { id: 'test-6-1-5', name: 'Suspended Solids', charge: '₹375' },
          { id: 'test-6-1-6', name: 'Dissolved Solids', charge: '₹375' },
          { id: 'test-6-1-7', name: 'Oil & Grease', charge: '₹600' },
          { id: 'test-6-1-8', name: 'Volatile Suspended Solids', charge: '₹375' },
          { id: 'test-6-1-9', name: 'pH', charge: '₹225' },
          { id: 'test-6-1-10', name: 'BOD', charge: '₹1125' },
          { id: 'test-6-1-11', name: 'COD (Permanganate)', charge: '₹750' },
          { id: 'test-6-1-12', name: 'COD (Dichromate)', charge: '₹1125' },
          { id: 'test-6-1-13', name: 'DO', charge: '₹450' },
          { id: 'test-6-1-14', name: 'Volatile Solids', charge: '₹450' },
          { id: 'test-6-1-15', name: 'Chloride', charge: '₹450' },
          { id: 'test-6-1-16', name: 'Sulphide', charge: '₹450' },
          { id: 'test-6-1-17', name: 'Sulphite', charge: '₹450' },
          { id: 'test-6-1-18', name: 'Sulphate', charge: '₹450' },
          { id: 'test-6-1-19', name: 'Phosphate', charge: '₹450' },
          { id: 'test-6-1-20', name: 'Sodium', charge: '₹450' },
          { id: 'test-6-1-21', name: 'Potassium', charge: '₹450' },
          { id: 'test-6-1-22', name: 'Alkalinity', charge: '₹1125' },
          { id: 'test-6-1-23', name: 'Total Hardness', charge: '₹1200' },
          { id: 'test-6-1-24', name: 'Calcium', charge: '₹450' },
          { id: 'test-6-1-25', name: 'Bicarbonate', charge: '₹450' },
          { id: 'test-6-1-26', name: 'Carbonate', charge: '₹450' },
          { id: 'test-6-1-27', name: 'Iron', charge: '₹600' }
        ]
      }
    ]
  }
];
