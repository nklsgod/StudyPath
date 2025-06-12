import { db, modules } from './index';

const thmModules = [
  // Orientierungsphase
  { pool: 'Orientierungsphase', code: 'MAN1001', name: 'Grundlagen und Unternehmenssoftware', credits: 10, category: 'MAN' },
  { pool: 'Orientierungsphase', code: 'MAN1002', name: 'Grundlagen des Marketing', credits: 5, category: 'MAN' },
  { pool: 'Orientierungsphase', code: 'MK1001', name: 'Digitale Medien + Kommunikation 1', credits: 10, category: 'MK' },
  { pool: 'Orientierungsphase', code: 'MK1002', name: 'Digitale Medien + Kommunikation 2', credits: 5, category: 'MK' },
  { pool: 'Orientierungsphase', code: 'GEN1001', name: 'Integrationsprojekt (Orientierungsphase)', credits: 15, category: 'GEN' },
  { pool: 'Orientierungsphase', code: 'INF1001', name: 'Webbasierte Programmierung 1', credits: 10, category: 'INF' },
  { pool: 'Orientierungsphase', code: 'INF1002', name: 'Webbasierte Programmierung 2', credits: 5, category: 'INF' },

  // IT Vertiefung
  { pool: 'IT Vertiefung', code: 'INF2104', name: 'Betriebssysteme und Rechnernetze', credits: 6, category: 'INF' },
  { pool: 'IT Vertiefung', code: 'INF2103', name: 'CMS und Webanwendungen', credits: 6, category: 'INF' },
  { pool: 'IT Vertiefung', code: 'MAN2109', name: 'Datenanalyse von Social Media', credits: 6, category: 'MAN' },
  { pool: 'IT Vertiefung', code: 'INF2206', name: 'Interaktive Systeme', credits: 6, category: 'INF' },
  { pool: 'IT Vertiefung', code: 'INF2105', name: 'Konzepte moderner Softwareentwicklung', credits: 9, category: 'INF' },
  { pool: 'IT Vertiefung', code: 'INF2102', name: 'Konzepte und Realisierung objektorientierter Programmierung', credits: 3, category: 'INF' },
  { pool: 'IT Vertiefung', code: 'INF2001', name: 'Software Engineering: Konzepte und Methoden', credits: 6, category: 'INF' },
  { pool: 'IT Vertiefung', code: 'INF2002', name: 'Software Engineering: Realisierung', credits: 9, category: 'INF' },
  { pool: 'IT Vertiefung', code: 'INF1007', name: 'Theoretische Informatik 1', credits: 6, category: 'INF' },
  { pool: 'IT Vertiefung', code: 'INF1008', name: 'Theoretische Informatik 2', credits: 6, category: 'INF' },
  { pool: 'IT Vertiefung', code: 'INF2101', name: 'Webtechnologien', credits: 6, category: 'INF' },

  // Überfachlicher Pool
  { pool: 'Überfachlicher Pool', code: 'GS2501', name: 'Ausbildereignung', credits: 6, category: 'GS' },
  { pool: 'Überfachlicher Pool', code: 'GS2506', name: 'Auslandssemester+', credits: 6, category: 'GS' },
  { pool: 'Überfachlicher Pool', code: 'GS2204', name: 'Bits und Bäume: Digitalisierung nachhaltig gestalten', credits: 3, category: 'GS' },
  { pool: 'Überfachlicher Pool', code: 'GS2203', name: 'Digitalwissenschaften – geisteswissenschaftlich gedacht', credits: 3, category: 'GS' },
  { pool: 'Überfachlicher Pool', code: 'GS2514', name: 'Diversität', credits: 3, category: 'GS' },
  { pool: 'Überfachlicher Pool', code: 'GS2518', name: 'English for STEM 1', credits: 3, category: 'GS' },
  { pool: 'Überfachlicher Pool', code: 'GS2519', name: 'English for STEM 2', credits: 3, category: 'GS' },
  { pool: 'Überfachlicher Pool', code: 'GS2520', name: 'English for STEM 3', credits: 3, category: 'GS' },
  { pool: 'Überfachlicher Pool', code: 'GS2512', name: 'Ethik im Management', credits: 3, category: 'GS' },
  { pool: 'Überfachlicher Pool', code: 'GS2202', name: 'Gesellschaftliche Verantwortung in der Informatik', credits: 3, category: 'GS' },
  { pool: 'Überfachlicher Pool', code: 'GS2522', name: 'Gesellschaftliches und soziales Engagement', credits: 3, category: 'GS' },
  { pool: 'Überfachlicher Pool', code: 'GS2521', name: 'Hack the world a better place – Lernen durch Begeisterung anderer', credits: 3, category: 'GS' },
  { pool: 'Überfachlicher Pool', code: 'GS2508', name: 'Improvisationstheater – Schulung der Kreativität', credits: 3, category: 'GS' },
  { pool: 'Überfachlicher Pool', code: 'GS2205', name: 'International Buddy Programme – Intercultural Competence and Encounters', credits: 3, category: 'GS' },
  { pool: 'Überfachlicher Pool', code: 'GS2523', name: 'KI im E‑Learning: Potenziale und Praxis', credits: 6, category: 'GS' },
  { pool: 'Überfachlicher Pool', code: 'GS2510', name: 'Konfliktmanagement und Mediation', credits: 3, category: 'GS' },
  { pool: 'Überfachlicher Pool', code: 'GS2509', name: 'Kreativitätstechniken', credits: 3, category: 'GS' },
  { pool: 'Überfachlicher Pool', code: 'GS2517', name: 'Lerngestaltung, Prüfungsvorbereitung und Stressbewältigung im Studium', credits: 3, category: 'GS' },
  { pool: 'Überfachlicher Pool', code: 'MAT1001', name: 'Mathematik 1', credits: 6, category: 'MAT' },
  { pool: 'Überfachlicher Pool', code: 'MAT1002', name: 'Mathematik 2', credits: 6, category: 'MAT' },
  { pool: 'Überfachlicher Pool', code: 'GS2502', name: 'Methoden und Didaktik für Tutorinnen und Tutoren', credits: 3, category: 'GS' },
  { pool: 'Überfachlicher Pool', code: 'GS2511', name: 'Mit der richtigen Technik das Lernen lernen', credits: 3, category: 'GS' },
  { pool: 'Überfachlicher Pool', code: 'GS2513', name: 'Moderation in Unternehmen und Organisationen', credits: 3, category: 'GS' },
  { pool: 'Überfachlicher Pool', code: 'NAT2001', name: 'Physikalische, technische und mathematische Grundlagen', credits: 6, category: 'NAT' },
  { pool: 'Überfachlicher Pool', code: 'GS2201', name: 'Recht für Informatiker/innen', credits: 3, category: 'GS' },
  { pool: 'Überfachlicher Pool', code: 'GS2507', name: 'Rhetorik und Körpersprache', credits: 3, category: 'GS' },
  { pool: 'Überfachlicher Pool', code: 'MAT2201', name: 'Statistik und Datenanalyse', credits: 6, category: 'MAT' },
  { pool: 'Überfachlicher Pool', code: 'GS2503', name: 'Teamentwicklung', credits: 6, category: 'GS' },
  { pool: 'Überfachlicher Pool', code: 'GS2516', name: 'Umgang mit Diskriminierung: Prävention und Intervention', credits: 3, category: 'GS' },
  { pool: 'Überfachlicher Pool', code: 'GS2505', name: 'Understanding Intercultural Interactions', credits: 3, category: 'GS' },
  { pool: 'Überfachlicher Pool', code: 'GS2515', name: 'Verhandlungsmanagement', credits: 3, category: 'GS' },
  { pool: 'Überfachlicher Pool', code: 'GS2504', name: 'Zeitmanagement', credits: 3, category: 'GS' },

  // Wahlpflichtpool
  { pool: 'Wahlpflichtpool', code: 'INF2201', name: 'Anwendung systemnaher Konzepte in der Programmierung', credits: 6, category: 'INF' },
  { pool: 'Wahlpflichtpool', code: 'MK2504', name: 'Audio‑Podcasting', credits: 3, category: 'MK' },
  { pool: 'Wahlpflichtpool', code: 'MAN2504', name: 'Big Data', credits: 6, category: 'MAN' },
  { pool: 'Wahlpflichtpool', code: 'INF2537', name: 'Blockchain Technologien: Grundlagen, Anwendungen und Frameworks', credits: 6, category: 'INF' },
  { pool: 'Wahlpflichtpool', code: 'MK2507', name: 'Brand Design', credits: 6, category: 'MK' },
  { pool: 'Wahlpflichtpool', code: 'MAN2509', name: 'Business Analytics', credits: 6, category: 'MAN' },
  { pool: 'Wahlpflichtpool', code: 'MAN2501', name: 'Change‑Management', credits: 6, category: 'MAN' },
  { pool: 'Wahlpflichtpool', code: 'INF2544', name: 'Containerisierte Anwendungen', credits: 6, category: 'INF' },
  { pool: 'Wahlpflichtpool', code: 'INF2514', name: 'Content Management Systeme: Konzepte und Realisierung', credits: 6, category: 'INF' },
  { pool: 'Wahlpflichtpool', code: 'INF2507', name: 'Cross‑Platform Development', credits: 9, category: 'INF' },
  { pool: 'Wahlpflichtpool', code: 'INF2546', name: 'Cybersicherheit im Unternehmen', credits: 6, category: 'INF' },
  { pool: 'Wahlpflichtpool', code: 'INF2539', name: 'Data Literacy in den digitalen Geistes‑ und Sozialwissenschaften', credits: 6, category: 'INF' },
  { pool: 'Wahlpflichtpool', code: 'INF2540', name: 'Daten und Wissensmodellierung in den digitalen Geistes‑ und Sozialwissenschaften', credits: 6, category: 'INF' },
  { pool: 'Wahlpflichtpool', code: 'INF2204', name: 'Datenbanksysteme', credits: 6, category: 'INF' },
  { pool: 'Wahlpflichtpool', code: 'MAN2507', name: 'Digitale Geschäftsmodelle und digitale Transformation', credits: 6, category: 'MAN' },
  { pool: 'Wahlpflichtpool', code: 'II2522', name: 'Digitale Gestaltung und Fabrikation von Prototypen', credits: 6, category: 'II' },
  { pool: 'Wahlpflichtpool', code: 'MAN2506', name: 'Digitale Innovationen', credits: 6, category: 'MAN' },
  { pool: 'Wahlpflichtpool', code: 'MAN2512', name: 'Digitales Projektmanagement', credits: 6, category: 'MAN' },
  { pool: 'Wahlpflichtpool', code: 'MK2501', name: 'E‑Learning', credits: 6, category: 'MK' },
  { pool: 'Wahlpflichtpool', code: 'INF2526', name: 'Effiziente Algorithmen und ihre Anwendungen', credits: 6, category: 'INF' },
  { pool: 'Wahlpflichtpool', code: 'INF2205', name: 'Einführung IT‑Security: Kryptografie, Software und …', credits: 6, category: 'INF' },
  { pool: 'Wahlpflichtpool', code: 'INF2504', name: 'Entwicklung mobiler Applikationen', credits: 9, category: 'INF' },
  { pool: 'Wahlpflichtpool', code: 'INF2505', name: 'Entwicklung webbasierter Client‑Server‑Systeme', credits: 9, category: 'INF' },
  { pool: 'Wahlpflichtpool', code: 'INF2536', name: 'Evaluation Interaktiver Systeme', credits: 6, category: 'INF' },
  { pool: 'Wahlpflichtpool', code: 'MK2508', name: 'Forschungsfelder Medien', credits: 6, category: 'MK' },
  { pool: 'Wahlpflichtpool', code: 'INF2207', name: 'Grundlagen der Data Science', credits: 6, category: 'INF' },
  { pool: 'Wahlpflichtpool', code: 'INF2527', name: 'Grundlagen des Cloud Computing', credits: 6, category: 'INF' },
  { pool: 'Wahlpflichtpool', code: 'II2521', name: 'Haptische Benutzerschnittstellen', credits: 6, category: 'II' },
  { pool: 'Wahlpflichtpool', code: 'II2515', name: 'Industrie 4.0 – Einführung, Konzepte und Technologien', credits: 6, category: 'II' },
  { pool: 'Wahlpflichtpool', code: 'MAN2505', name: 'Innovationsmanagement', credits: 3, category: 'MAN' },
  { pool: 'Wahlpflichtpool', code: 'INF2549', name: 'KI in der Anwendung: Sprachverarbeitung mit Transformern', credits: 6, category: 'INF' },
  { pool: 'Wahlpflichtpool', code: 'INF2550', name: 'KI in der Software Entwicklung', credits: 6, category: 'INF' },
  { pool: 'Wahlpflichtpool', code: 'INF2528', name: 'Machine Learning', credits: 6, category: 'INF' },
  { pool: 'Wahlpflichtpool', code: 'MK2510', name: 'Mediales Praktikum', credits: 9, category: 'MK' },
  { pool: 'Wahlpflichtpool', code: 'MAN2503', name: 'Online Marketing in der Praxis', credits: 6, category: 'MAN' },
  { pool: 'Wahlpflichtpool', code: 'INF2548', name: 'Online Payment Solutions', credits: 6, category: 'INF' },
  { pool: 'Wahlpflichtpool', code: 'INF2508', name: 'Praktikum Game Design und Development', credits: 9, category: 'INF' },
  { pool: 'Wahlpflichtpool', code: 'MK2511', name: 'Praktikum UX/Usability Labor', credits: 9, category: 'MK' },
  { pool: 'Wahlpflichtpool', code: 'INF2516', name: 'Praktikum Webtechnologien', credits: 9, category: 'INF' },
  { pool: 'Wahlpflichtpool', code: 'INF2503', name: 'Praktikum Wirtschaftsinformatik', credits: 9, category: 'INF' },
  { pool: 'Wahlpflichtpool', code: 'II2516', name: 'Projekt – Industrie 4.0 und Digitalisierung', credits: 6, category: 'II' },
  { pool: 'Wahlpflichtpool', code: 'INF2529', name: 'Projektentwicklung mit Kotlin', credits: 6, category: 'INF' },
  { pool: 'Wahlpflichtpool', code: 'MAN2510', name: 'Projektmanagement erleben', credits: 3, category: 'MAN' },
  { pool: 'Wahlpflichtpool', code: 'MK2513', name: 'Projektwerkstatt Digitale Medien', credits: 3, category: 'MK' },
  { pool: 'Wahlpflichtpool', code: 'MK2502', name: 'Public Relations', credits: 6, category: 'MK' },
  { pool: 'Wahlpflichtpool', code: 'MK2505', name: 'Quantified Self und Transhumanismus', credits: 3, category: 'MK' },
  { pool: 'Wahlpflichtpool', code: 'MK2509', name: 'Quantitative Markt‑, Medien‑ und Kommunikationsforschung', credits: 6, category: 'MK' },
  { pool: 'Wahlpflichtpool', code: 'MAN2508', name: 'Requirements Engineering', credits: 6, category: 'MAN' },
  { pool: 'Wahlpflichtpool', code: 'MK2506', name: 'Ringvorlesung Medien', credits: 6, category: 'MK' },
  { pool: 'Wahlpflichtpool', code: 'INF2513', name: 'Ruby On Rails', credits: 6, category: 'INF' },
  { pool: 'Wahlpflichtpool', code: 'INF2515', name: 'SAP R/3 – Einführung in ABAP', credits: 6, category: 'INF' },
  { pool: 'Wahlpflichtpool', code: 'INF2522', name: 'Secure Software Engineering', credits: 6, category: 'INF' },
  { pool: 'Wahlpflichtpool', code: 'INF2532', name: 'Sicherheit und Datenschutz in der Webentwicklung', credits: 6, category: 'INF' },
  { pool: 'Wahlpflichtpool', code: 'MK2515', name: 'Social Media für non‑profit Organisationen', credits: 6, category: 'MK' },
  { pool: 'Wahlpflichtpool', code: 'INF2531', name: 'Swift‑Programmierung unter iOS', credits: 6, category: 'INF' },
  { pool: 'Wahlpflichtpool', code: 'MK2514', name: 'Tools für Visuelle Medien', credits: 3, category: 'MK' },
  { pool: 'Wahlpflichtpool', code: 'GEN2501', name: 'Tools quantitativer Forschung', credits: 3, category: 'GEN' },
  { pool: 'Wahlpflichtpool', code: 'MAN2502', name: 'Unternehmensberatung', credits: 6, category: 'MAN' },
  { pool: 'Wahlpflichtpool', code: 'MK2512', name: 'Visuelle Kommunikation', credits: 6, category: 'MK' },
  { pool: 'Wahlpflichtpool', code: 'INF2519', name: 'Web Programming Weeks 1', credits: 6, category: 'INF' },
];

async function seed() {
  console.log('Start seeding...');

  try {
    // Delete existing data (be careful with order due to foreign keys)
    await db.delete(modules);
    
    // Insert modules
    await db.insert(modules).values(thmModules);
    
    console.log(`Created ${thmModules.length} THM modules`);
    console.log('Seeding finished.');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seed();
}