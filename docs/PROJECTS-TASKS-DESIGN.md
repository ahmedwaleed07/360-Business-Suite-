# ASAS Projects & Tasks — interaction concept

This is an **original ASAS work-management interaction model**, not a clone or a reproduction of Asana's branding or source. It responds to user feedback about workflow fluidity and fine-grained collaboration.

## Usability principles
- Change section name and collaborators without leaving the board.
- Any task has a short contextual menu for edit, duplicate, move, priority, complete and delete.
- Edit task details in a side drawer, without navigating to another screen.
- Quick-add directly to a section, keyboard shortcut N, drag and drop for desktop, menu-based move for mobile.
- Board and list presentations reflect the same underlying tasks.
- My Tasks filter and status counters give employees a lightweight personal view.
- Build on CRM → Project → Tasks → Procurement → ERP, rather than isolating task management from business operations.

## Tenant and permission model for production
- Company Super Admin controls organization-level feature access.
- Project owner sets project collaborators; section editors can be delegated separately.
- Task assignee / watchers / section-level participants have separately defined read/comment/edit operations.
- Any membership or permission escalation goes through the authenticated Workers API and D1, never local UI state.
- Company/branch constraints apply to every project, section, task, comment, document, notification and audit event.
- Permission changes must update server-side authorization immediately and be audit logged.
- The UI should surface *why* a task is blocked rather than silently hiding it.

## This preview's limits
- Data is fictional and kept only in browser memory.
- Collaborator selections and roles in the preview are cosmetic, not server-enforced.
- No production notifications, real-time sync, attachments, payments, ERP or user authentication.
- The project module has not been added to the live D1 schema; this should happen via a separately reviewed migration.
- No personal/business information should be entered into a Public GitHub Pages demo.

## Roadmap
1. Original board UI prototype and interaction tests.
2. D1 schema for projects, sections, membership and tasks; explicit tenant-scoped Worker APIs.
3. Real organization identity and granular authorization.
4. Activity stream, subtasks, comments, attachments/R2, reminders.
5. CRM and ERP-linked tasks, approvals, templates, dependencies and analytics.
6. Mobile apps / PWA refinement, offline queue, notifications and sync conflict handling.
