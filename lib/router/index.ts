export enum AmoPage {
  Dashboard,
  LeadsList,
  LeadsPipeline,
  LeadsCard,
  LeadsDigitalPipeline,
  ContactsList,
  ContactsCard,
  CompaniesList,
  CompaniesCard,
  ContactsAndCompaniesList,
  TasksList,
  TasksLine,
  TasksCalendar,
  Advanced,
  Unknown
}

export type AmoRoute = {
  page: AmoPage
  cardId?: number
  pipelineId?: number
  tasksPeriod?: string
}

export function getCurrentRoute(): AmoRoute {
  const h: string = window.location.href

  if (/dashboard/.test(h)) {
    return { page: AmoPage.Dashboard }
  } else if (/leads\/pipeline/.test(h)) {
    const m = h.match(/\/leads\/pipeline\/([0-9]+)/)
    return { page: AmoPage.LeadsPipeline, pipelineId: (m && +m[1]) || undefined }
  } else if (/leads\/list/.test(h)) {
    return { page: AmoPage.LeadsList }
  } else if (/leads\/list\/pipeline/.test(h)) {
    const m = h.match(/\/leads\/list\/pipeline\/([0-9]+)/)
    return { page: AmoPage.LeadsList, pipelineId: (m && +m[1]) || undefined }
  } else if (/leads\/detail/.test(h)) {
    const m = h.match(/\/leads\/detail\/([0-9]+)/)
    return { page: AmoPage.LeadsCard, cardId: (m && +m[1]) || undefined }
  } else if (/leads\/add/.test(h)) {
    return { page: AmoPage.LeadsCard }
  } else if (/settings\/pipeline\/leads/.test(h)) {
    const m = h.match(/\/settings\/pipeline\/leads\/([0-9]+)/)
    return { page: AmoPage.LeadsDigitalPipeline, pipelineId: (m && +m[1]) || undefined }
  } else if (/todo\/line/.test(h)) {
    return { page: AmoPage.TasksLine }
  } else if (/todo\/list/.test(h)) {
    return { page: AmoPage.TasksList }
  } else if (/todo\/calendar/.test(h)) {
    const m = h.match(/\/todo\/calendar\/(week|month|day)/)
    return { page: AmoPage.TasksCalendar, tasksPeriod: (m && m[1]) || undefined }
  } else if (/contacts\/list\/companies/.test(h)) {
    return { page: AmoPage.CompaniesList }
  } else if (/contacts\/list\/contacts/.test(h)) {
    return { page: AmoPage.ContactsList }
  } else if (/contacts\/list/.test(h)) {
    return { page: AmoPage.ContactsAndCompaniesList }
  } else if (/contacts\/detail/.test(h)) {
    const m = h.match(/\/contacts\/detail\/([0-9]+)/)
    return { page: AmoPage.ContactsCard, cardId: (m && +m[1]) || undefined }
  } else if (/companies\/detail/.test(h)) {
    const m = h.match(/\/companies\/detail\/([0-9]+)/)
    return { page: AmoPage.CompaniesCard, cardId: (m && +m[1]) || undefined }
  } else if (/contacts\/add/.test(h)) {
    return { page: AmoPage.ContactsCard }
  } else if (/companies\/add/.test(h)) {
    return { page: AmoPage.CompaniesCard }
  } else if (/advanced/.test(h)) {
    return { page: AmoPage.Advanced }
  }

  return { page: AmoPage.Unknown }
}
