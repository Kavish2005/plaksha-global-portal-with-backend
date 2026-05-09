from fpdf import FPDF, XPos, YPos
import os

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "demo_docs")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def clean(text):
    return (text
        .replace("—", "--")
        .replace("–", "-")
        .replace("‘", "'")
        .replace("’", "'")
        .replace("“", '"')
        .replace("”", '"'))


class Doc(FPDF):
    def __init__(self):
        super().__init__()
        self.set_margins(25, 20, 25)
        self.set_auto_page_break(auto=True, margin=20)

    def hline(self):
        self.set_draw_color(180, 180, 180)
        self.line(self.get_x(), self.get_y(), self.get_x() + self.epw, self.get_y())
        self.ln(6)

    def header_block(self, title, subtitle=None):
        self.set_font("Helvetica", "B", 14)
        self.cell(0, 8, clean(title), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        if subtitle:
            self.set_font("Helvetica", "", 10)
            self.set_text_color(90, 90, 90)
            self.cell(0, 6, clean(subtitle), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            self.set_text_color(0, 0, 0)
        self.ln(4)
        self.hline()

    def para(self, text, bold=False, size=10.5, color=(0, 0, 0), spacing=5.5):
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "B" if bold else "", size)
        self.set_text_color(*color)
        self.multi_cell(self.epw, spacing, clean(text))
        self.set_text_color(0, 0, 0)

    def gap(self, h=4):
        self.ln(h)

    def meta_line(self, label, value):
        self.set_font("Helvetica", "B", 9.5)
        self.set_text_color(80, 80, 80)
        self.cell(38, 5.5, label + ":", new_x=XPos.RIGHT, new_y=YPos.TOP)
        self.set_font("Helvetica", "", 9.5)
        self.set_text_color(0, 0, 0)
        self.cell(0, 5.5, clean(value), new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    def sender_block(self, name, title, institution, address, contact=""):
        self.set_font("Helvetica", "B", 12)
        self.cell(0, 7, clean(name), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_font("Helvetica", "", 9.5)
        self.set_text_color(70, 70, 70)
        for line in [title, institution, address, contact]:
            if line:
                self.cell(0, 5, clean(line), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_text_color(0, 0, 0)
        self.gap(6)
        self.hline()
        self.set_x(self.l_margin)


# ── UTRIP Research Statement ──────────────────────────────────────────────────
def utrip_research_statement():
    doc = Doc()
    doc.add_page()
    doc.header_block(
        "Research Statement",
        "University of Tokyo Research Internship Programme (UTRIP) -- Kavish Kumar",
    )
    doc.meta_line("Applicant", "Kavish Kumar")
    doc.meta_line("Institution", "Plaksha University, Mohali")
    doc.meta_line("Programme", "BTech -- Computer Science and Artificial Intelligence")
    doc.meta_line("Email", "kavish.kumar.ug23@plaksha.edu.in")
    doc.gap(6)

    doc.para(
        "My research interest lies at the intersection of machine learning and human-centred "
        "computing -- specifically, building models that are robust to real-world variation in "
        "human behaviour and biology. I am applying to UTRIP to deepen this work in a rigorous, "
        "internationally collaborative environment."
    )
    doc.gap(3)
    doc.para(
        "My most significant project to date is an automatic speech recognition system for "
        "dysarthric speakers, developed at Plaksha University. Dysarthria -- caused by conditions "
        "such as ALS and Cerebral Palsy -- distorts speech in ways that render standard ASR "
        "systems unreliable. I built a speaker-independent system using the wav2vec 2.0 model to "
        "extract latent acoustic embeddings, feeding these into a bidirectional LSTM for sequence "
        "prediction. I pre-trained on LibriSpeech and fine-tuned on the TORGO dataset, achieving "
        "a word error rate of 48% and a character error rate of 27% -- approaching the accuracy "
        "of speaker-dependent systems, which require individual calibration per user. This result "
        "demonstrated that generalised dysarthric ASR is tractable, and surfaced several questions "
        "I want to pursue: how do self-supervised representations handle non-standard phonation, "
        "and can we transfer across dysarthria subtypes with limited labelled data?"
    )
    doc.gap(3)
    doc.para(
        "Alongside this, I have worked on predictive modelling with structured data. My flight "
        "delay analysis project involved large-scale web scraping of live FlightRadar24 data, "
        "XGBoost classification of delay events, and a logistic regression model that isolated "
        "airline-specific delay contribution -- finding that switching from Air India to IndiGo "
        "reduces delay odds by 84% domestically. At NTU Singapore in the summer of 2024, I "
        "applied k-means clustering and random forest regression to box office prediction, gaining "
        "experience in collaborative, cross-institutional research."
    )
    doc.gap(3)
    doc.para(
        "At UTRIP, I am particularly interested in joining a group working on computational "
        "biology, machine learning for scientific data, or human-computer interaction. I want to "
        "understand how methods from deep learning -- especially representation learning -- can be "
        "adapted to domains where labelled data is scarce and individual variation is high. I am "
        "comfortable in Python, experienced with PyTorch and the HuggingFace ecosystem, and eager "
        "to contribute to ongoing lab work from day one."
    )
    doc.gap(3)
    doc.para(
        "I see UTRIP as an opportunity not just to advance a specific project, but to develop the "
        "research instincts -- how to frame a problem, design a controlled experiment, and "
        "communicate findings -- that will define the rest of my academic career."
    )

    path = os.path.join(OUTPUT_DIR, "UTRIP_Research_Statement_Kavish_Kumar.pdf")
    doc.output(path)
    print(f"Saved: {path}")


# ── UTRIP LOR ─────────────────────────────────────────────────────────────────
def utrip_lor():
    doc = Doc()
    doc.add_page()
    doc.sender_block(
        "Dr. Aditya Venkatesan",
        "Assistant Professor, Department of Computer Science and Artificial Intelligence",
        "Plaksha University, Sector 101, Mohali, Punjab 140306",
        "aditya.venkatesan@plaksha.edu.in  |  +91-172-521-4892",
    )

    doc.para("9 May 2026", size=9.5, color=(80, 80, 80))
    doc.gap(4)
    doc.para("To the UTRIP Admissions Committee,\nUniversity of Tokyo Faculty of Science,")
    doc.gap(4)

    doc.para(
        "I write with genuine enthusiasm to recommend Kavish Kumar for the University of Tokyo "
        "Research Internship Programme. Kavish completed his final-year capstone project under my "
        "supervision during January to May 2025, and I consider him one of the more technically "
        "self-directed students I have mentored at Plaksha."
    )
    doc.gap(3)
    doc.para(
        "The project -- automatic speech recognition for dysarthric speakers -- is a technically "
        "demanding problem that most final-year undergraduates would have simplified considerably. "
        "Kavish did not. He chose to build a speaker-independent system, which requires the model "
        "to generalise across individuals whose speech varies significantly not just "
        "person-to-person, but day-to-day. He identified wav2vec 2.0 as an appropriate feature "
        "extractor after surveying the literature independently, implemented a bidirectional LSTM "
        "decoder, and handled the full pipeline: dataset alignment between LibriSpeech and TORGO, "
        "fine-tuning strategy, and evaluation. His final word error rate of 48% and character "
        "error rate of 27% are competitive with published speaker-dependent baselines -- a "
        "meaningful result for a six-month undergraduate project."
    )
    doc.gap(3)
    doc.para(
        "What distinguished Kavish was not just technical competence but research judgement. When "
        "an early fine-tuning run produced unexpectedly poor results, he did not simply re-run "
        "with different hyperparameters. He went back to the embeddings, visualised the latent "
        "space, and identified that the wav2vec representations for dysarthric speech were "
        "clustering differently than expected -- a finding that motivated a different fine-tuning "
        "schedule. That kind of diagnostic thinking is exactly what separates a researcher from "
        "a practitioner."
    )
    doc.gap(3)
    doc.para(
        "Beyond this project, I am aware of Kavish's statistical work on flight delay data and "
        "his experience at NTU Singapore. His range -- from signal processing to tabular ML to "
        "collaborative research in a foreign institution -- gives me confidence that he will adapt "
        "quickly to a new lab environment and contribute meaningfully within UTRIP's six-week "
        "window."
    )
    doc.gap(3)
    doc.para(
        "I recommend Kavish without reservation. He is technically prepared, intellectually "
        "curious, and -- from what I observed over five months of close supervision -- genuinely "
        "motivated by the questions rather than the credential. Please feel free to contact me "
        "directly if you would like to discuss his candidacy further."
    )
    doc.gap(6)
    doc.para("Yours sincerely,")
    doc.gap(8)
    doc.para("Dr. Aditya Venkatesan", bold=True)
    doc.para("Assistant Professor, CS & AI\nPlaksha University", size=9.5, color=(70, 70, 70))

    path = os.path.join(OUTPUT_DIR, "UTRIP_LOR_Kavish_Kumar.pdf")
    doc.output(path)
    print(f"Saved: {path}")


# ── Stanford Research Statement ───────────────────────────────────────────────
def stanford_research_statement():
    doc = Doc()
    doc.add_page()
    doc.header_block(
        "Research Statement",
        "Stanford Summer Research Program -- Kavish Kumar",
    )
    doc.meta_line("Applicant", "Kavish Kumar")
    doc.meta_line("Institution", "Plaksha University, Mohali")
    doc.meta_line("Programme", "BTech -- Computer Science and Artificial Intelligence")
    doc.meta_line("Email", "kavish.kumar.ug23@plaksha.edu.in")
    doc.gap(6)

    doc.para(
        "I am a final-year undergraduate in Computer Science and Artificial Intelligence at "
        "Plaksha University, with a developing interest in applied machine learning. My "
        "coursework and project experience have given me a foundation in core ML methods, and "
        "the Stanford Summer Research Program represents an opportunity to work alongside "
        "researchers who can help me understand what rigorous research practice actually looks "
        "like in a leading environment."
    )
    doc.gap(3)
    doc.para(
        "My most substantial project involved building a speech recognition system for people "
        "with dysarthria -- a motor speech disorder associated with conditions like ALS and "
        "Cerebral Palsy. Standard ASR systems perform poorly on dysarthric speech because they "
        "are trained on neurotypical data, and I wanted to explore whether a fine-tuned "
        "wav2vec 2.0 model, paired with a bidirectional LSTM, could do better. Working with "
        "the TORGO dataset, I achieved a word error rate of 48% and a character error rate of "
        "27%, which is reasonable for a speaker-independent setup -- though there is clearly "
        "significant room for improvement. The project taught me a great deal about the gap "
        "between getting a model to run and getting it to generalise."
    )
    doc.gap(3)
    doc.para(
        "I have also worked on more applied data science problems. I built a flight delay "
        "classification model using XGBoost and FlightRadar24 data, and in the summer of 2024 "
        "I participated in a short research project at NTU Singapore on box office prediction "
        "using k-means clustering and random forest regression. These projects were largely "
        "self-directed, which meant I learned to scope a problem practically, but also that I "
        "sometimes made choices I would now revisit with better guidance."
    )
    doc.gap(3)
    doc.para(
        "At Stanford, I am open to working on problems at the intersection of machine learning "
        "and either language or signal processing. I am most comfortable in Python and have "
        "worked with PyTorch and the HuggingFace library. I am not looking to arrive as an "
        "independent researcher -- I want to contribute to ongoing work, learn how a strong "
        "research group structures its process, and come away with a clearer sense of the "
        "problems I want to focus on going forward."
    )
    doc.gap(3)
    doc.para(
        "I am aware that my academic record is not exceptional, and I do not want to overstate "
        "what I bring. What I can offer is genuine interest, a willingness to work hard, and "
        "the technical grounding to be useful in a lab context from an early stage."
    )

    path = os.path.join(OUTPUT_DIR, "Stanford_Research_Statement_Kavish_Kumar.pdf")
    doc.output(path)
    print(f"Saved: {path}")


# ── Stanford LOR ──────────────────────────────────────────────────────────────
def stanford_lor():
    doc = Doc()
    doc.add_page()
    doc.sender_block(
        "Dr. Aditya Venkatesan",
        "Assistant Professor, Department of Computer Science and Artificial Intelligence",
        "Plaksha University, Sector 101, Mohali, Punjab 140306",
        "aditya.venkatesan@plaksha.edu.in  |  +91-172-521-4892",
    )

    doc.para("9 May 2026", size=9.5, color=(80, 80, 80))
    doc.gap(4)
    doc.para(
        "To the Stanford Summer Research Program Admissions Committee,\nStanford University,"
    )
    doc.gap(4)

    doc.para(
        "I am writing to support the application of Kavish Kumar for the Stanford Summer "
        "Research Program. Kavish completed his final-year capstone project under my supervision "
        "between January and May 2025, and I am glad to speak to his abilities and work ethic "
        "from that experience."
    )
    doc.gap(3)
    doc.para(
        "The project addressed speech recognition for dysarthric speakers -- a problem I "
        "suggested knowing it would stretch him. Kavish got to grips with the relevant literature "
        "at a reasonable pace and settled on a wav2vec 2.0 plus bidirectional LSTM architecture, "
        "which was a sensible choice given the constraints. The execution was mostly solid: he "
        "handled dataset preparation, pre-training on LibriSpeech, and fine-tuning on TORGO "
        "without needing significant hand-holding on the engineering side. His final results -- "
        "a word error rate of 48% and character error rate of 27% on a speaker-independent "
        "evaluation -- are respectable, though with more experience he would have pushed the "
        "analysis further and been more critical of what the numbers actually tell us."
    )
    doc.gap(3)
    doc.para(
        "More broadly, Kavish is a student who is actively developing his research instincts. "
        "He is technically capable -- comfortable with Python, PyTorch, and standard ML "
        "workflows -- and he is consistent and diligent in his work. Where he has room to grow "
        "is in the higher-level research skills: knowing which questions are worth asking, "
        "being appropriately sceptical of results, and writing with precision. These are things "
        "that come with exposure to a strong research environment, which is part of why a "
        "programme like Stanford's would be valuable for him at this stage."
    )
    doc.gap(3)
    doc.para(
        "I should note that Kavish's GPA of 7.44 does not fully reflect his practical ability. "
        "His project work was stronger than his exam performance alone would suggest, and he "
        "tends to do better in hands-on, applied contexts. I would not describe him as a "
        "top-of-cohort student, but I would describe him as a genuinely motivated one who is "
        "on a clear upward trajectory and who I think would make good use of the opportunity."
    )
    doc.gap(3)
    doc.para(
        "I support his application. Please feel free to reach out if you would like any "
        "further details."
    )
    doc.gap(6)
    doc.para("Yours sincerely,")
    doc.gap(8)
    doc.para("Dr. Aditya Venkatesan", bold=True)
    doc.para("Assistant Professor, CS & AI\nPlaksha University", size=9.5, color=(70, 70, 70))

    path = os.path.join(OUTPUT_DIR, "Stanford_LOR_Kavish_Kumar.pdf")
    doc.output(path)
    print(f"Saved: {path}")


utrip_research_statement()
utrip_lor()
stanford_research_statement()
stanford_lor()
print("\nAll 4 PDFs generated in demo_docs/")
