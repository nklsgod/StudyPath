import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  real,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const moduleStatusEnum = pgEnum('module_status', [
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);

// Tables
export const users = pgTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const modules = pgTable('modules', {
  pool: text('pool').primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  credits: integer('credits').notNull(),
  category: text('category').notNull(),
});

export const userModules = pgTable('user_modules', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  modulePool: text('module_pool')
    .notNull()
    .references(() => modules.pool),
  status: moduleStatusEnum('status').default('PLANNED').notNull(),
  grade: real('grade'),
  semester: text('semester'),
  notes: text('notes'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const studyPlans = pgTable('study_plans', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  targetSemester: text('target_semester'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const studyPlanModules = pgTable('study_plan_modules', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  studyPlanId: text('study_plan_id')
    .notNull()
    .references(() => studyPlans.id, { onDelete: 'cascade' }),
  modulePool: text('module_pool')
    .notNull()
    .references(() => modules.pool),
  plannedSemester: text('planned_semester').notNull(),
  priority: integer('priority').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const modulePrerequisites = pgTable('module_prerequisites', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  modulePool: text('module_pool')
    .notNull()
    .references(() => modules.pool, { onDelete: 'cascade' }),
  prerequisitePool: text('prerequisite_pool')
    .notNull()
    .references(() => modules.pool, { onDelete: 'cascade' }),
  isRequired: boolean('is_required').default(true).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  studyPlans: many(studyPlans),
  userModules: many(userModules),
}));

export const modulesRelations = relations(modules, ({ many }) => ({
  userModules: many(userModules),
  studyPlanModules: many(studyPlanModules),
  prerequisites: many(modulePrerequisites, {
    relationName: 'modulePrerequisites',
  }),
  dependentModules: many(modulePrerequisites, {
    relationName: 'prerequisiteFor',
  }),
}));

export const userModulesRelations = relations(userModules, ({ one }) => ({
  user: one(users, {
    fields: [userModules.userId],
    references: [users.id],
  }),
  module: one(modules, {
    fields: [userModules.modulePool],
    references: [modules.pool],
  }),
}));

export const studyPlansRelations = relations(studyPlans, ({ one, many }) => ({
  user: one(users, {
    fields: [studyPlans.userId],
    references: [users.id],
  }),
  modules: many(studyPlanModules),
}));

export const studyPlanModulesRelations = relations(
  studyPlanModules,
  ({ one }) => ({
    studyPlan: one(studyPlans, {
      fields: [studyPlanModules.studyPlanId],
      references: [studyPlans.id],
    }),
    module: one(modules, {
      fields: [studyPlanModules.modulePool],
      references: [modules.pool],
    }),
  })
);

export const modulePrerequisitesRelations = relations(
  modulePrerequisites,
  ({ one }) => ({
    module: one(modules, {
      fields: [modulePrerequisites.modulePool],
      references: [modules.pool],
      relationName: 'modulePrerequisites',
    }),
    prerequisite: one(modules, {
      fields: [modulePrerequisites.prerequisitePool],
      references: [modules.pool],
      relationName: 'prerequisiteFor',
    }),
  })
);
