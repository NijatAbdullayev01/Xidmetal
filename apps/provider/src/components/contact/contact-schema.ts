/** @deprecated Shared package-dən import edin — geriyə uyğunluq üçün saxlanılır */
export {
  contactFormSchema,
  contactSubjectLabels,
  contactSubjectValues,
  type ContactFormInput,
  type ContactFormInput as ContactFormValues,
} from '@xidmetal/shared';

import { contactSubjectValues as subjects } from '@xidmetal/shared';

export type ContactSubject = (typeof subjects)[number];
