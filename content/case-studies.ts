// Case-study decks served at /case-study/<slug>/. The deck itself is never in this
// repo in readable form: the private case-studies repo encrypts it and pushes only
// public/case-study/<slug>/deck.enc here. Never write that file by hand.
export type CaseStudy = {
  slug: string;
  title: string;
};

export const caseStudies: CaseStudy[] = [{ slug: 'autocore', title: 'Hold the Work Line' }];
