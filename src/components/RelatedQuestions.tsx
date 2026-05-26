type RelatedQuestionsProps = {
  questions: string[];
};

export default function RelatedQuestions({ questions }: RelatedQuestionsProps) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-gray-900">相关问题</h2>

      <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
        {questions.map((question) => (
          <li key={question}>{question}</li>
        ))}
      </ul>
    </section>
  );
}
