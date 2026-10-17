export const AUDIT_ACTIONS = [
  'auth.login',
  'auth.logout',
  'user.create',
  'user.update',
  'user.delete',
  'pop.create',
  'pop.update',
  'pop.publish',
  'pop.approve',
  'pop.reject',
  'pop.new_version',
  'pop.soft_delete',
  'pop.confirm_read',
  'pop.change_request.create',
  'pop.change_request.respond',
  'pop.sign',
  'form.create',
  'nc.create',
  'nc.update_status',
  'training.create',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];