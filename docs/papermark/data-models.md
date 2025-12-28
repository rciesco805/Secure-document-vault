# Data Models Reference

## Core Entities

### Team
Primary organizational unit. All resources belong to a team.

```prisma
model Team {
  id      String @id @default(cuid())
  name    String
  plan    String @default("datarooms-plus")  // Always datarooms-plus for BF Fund
  users   UserTeam[]
  datarooms Dataroom[]
  viewers Viewer[]
  viewerGroups ViewerGroup[]
}
```

### Dataroom
Container for documents and folders, shared via links.

```prisma
model Dataroom {
  id           String @id @default(cuid())
  pId          String @unique  // Public ID: dr_xxxxx
  name         String
  teamId       String
  documents    DataroomDocument[]
  folders      DataroomFolder[]
  links        Link[]
  viewerGroups ViewerGroup[]
  brand        DataroomBrand?
}
```

### ViewerGroup
Groups viewers for permission management. **Quick Add** is a special group.

```prisma
model ViewerGroup {
  id         String @id @default(cuid())
  name       String
  isQuickAdd Boolean @default(false)  // True for Quick Add groups
  allowAll   Boolean @default(false)  // Full access to all content
  dataroomId String
  members    ViewerGroupMembership[]
  links      Link[]
  accessControls ViewerGroupAccessControls[]
}
```

### Link
Shareable access point to a document or dataroom.

```prisma
model Link {
  id                 String @id @default(cuid())
  name               String?
  linkType           LinkType  // DOCUMENT_LINK or DATAROOM_LINK
  dataroomId         String?
  groupId            String?   // Associated ViewerGroup
  audienceType       LinkAudienceType  // GENERAL or GROUP
  
  // Access Control
  emailProtected     Boolean @default(true)   // Require email
  emailAuthenticated Boolean @default(false)  // false = session-based
  allowList          String[]  // Allowed emails
  allowDownload      Boolean @default(false)
  password           String?
  expiresAt          DateTime?
  
  views              View[]
}
```

### Viewer
External user who views documents (not admin users).

```prisma
model Viewer {
  id         String @id @default(cuid())
  email      String
  verified   Boolean @default(false)
  teamId     String
  dataroomId String?
  groups     ViewerGroupMembership[]
}
```

### View
Analytics record of document/dataroom views.

```prisma
model View {
  id              String @id @default(cuid())
  linkId          String
  viewerEmail     String?
  viewerId        String?
  dataroomId      String?
  documentId      String?
  viewedAt        DateTime @default(now())
  duration        Int @default(0)
  completionRate  Float @default(0)
}
```

## Relationships Diagram

```
Team ─────────────────────────────────────────────┐
  │                                                │
  ├── Users (admin access)                         │
  │                                                │
  ├── Viewers ──────────────────────┐              │
  │     └── ViewerGroupMembership ──┤              │
  │                                  │              │
  ├── Datarooms ────────────────────┤              │
  │     ├── Documents               │              │
  │     ├── Folders                 │              │
  │     ├── Links ──────────────────┼── Views ─────┘
  │     │     └── allowList         │
  │     └── ViewerGroups ───────────┘
  │           ├── Quick Add (isQuickAdd=true)
  │           └── AccessControls
  │
  └── Plan: datarooms-plus (hardcoded)
```

## Key Defaults (BF Fund)

| Field | Default | Reason |
|-------|---------|--------|
| `Link.emailProtected` | `true` | Always require email verification |
| `Link.emailAuthenticated` | `false` | Session-based (no re-verification) |
| `Link.allowDownload` | `false` | No downloads by default |
| `Team.plan` | `datarooms-plus` | All features enabled |
| `ViewerGroup.isQuickAdd` | `false` | Only Quick Add groups are true |
| `ViewerGroup.allowAll` | `false` | Quick Add groups set to true |
