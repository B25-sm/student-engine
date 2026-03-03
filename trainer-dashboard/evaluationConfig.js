export const evaluationConfig = [
  {
    key: "technical_communication",
    label: "Technical Communication",
    weight: 15,
    levels: [
      { score: 100, label: "Explains complex concepts with industry-level clarity." },
      { score: 90, label: "Explains clearly with strong structure and confidence." },
      { score: 80, label: "Explains most concepts clearly with good flow." },
      { score: 70, label: "Explains correctly but lacks structure." },
      { score: 60, label: "Understands topic but struggles to articulate." },
      { score: 50, label: "Partial explanation with clarity gaps." },
      { score: 40, label: "Fragmented explanation; lacks depth." },
      { score: 30, label: "Basic understanding but poor explanation." },
      { score: 20, label: "Minimal understanding." },
      { score: 10, label: "Cannot explain concept." }
    ]
  },
  {
    key: "hr_communication",
    label: "HR Communication",
    weight: 15,
    levels: [
      { score: 100, label: "Interview-ready confidence and structure." },
      { score: 90, label: "Clear and confident responses." },
      { score: 80, label: "Good responses with slight hesitation." },
      { score: 70, label: "Understandable but lacks confidence." },
      { score: 60, label: "Answers but nervous." },
      { score: 50, label: "Short responses with clarity gaps." },
      { score: 40, label: "Struggles to express thoughts." },
      { score: 30, label: "Hesitant and inconsistent." },
      { score: 20, label: "Poor communication." },
      { score: 10, label: "Unable to respond properly." }
    ]
  }
];
