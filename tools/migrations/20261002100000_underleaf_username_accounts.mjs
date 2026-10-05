import { planIdentityMigration } from './lib/underleaf-username-identity.mjs'

async function migrate({ db }) {
  // Fresh upgrades execute this migration before the final identity migration.
  // Plan all names together so casing and missing names cannot create conflicts.
  const users = await db.users.find({}).toArray()
  const plan = planIdentityMigration(users)
  for (const { _id, fields } of plan) {
    await db.users.updateOne({ _id }, { $set: fields })
  }
  await db.users.createIndex(
    { username: 1 },
    { unique: true, sparse: true, name: 'username_1' }
  )
}

async function rollback({ db }) {
  await db.users.dropIndex('username_1')
}

export default { tags: ['server-ce'], migrate, rollback }
