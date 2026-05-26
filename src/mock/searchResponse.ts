import type { SearchResponse } from "@/types/search";

export const mockSearchResponse: SearchResponse = {
  status: "success",
  query: "图书馆怎么借书",
  answer: {
    summary:
      "图书馆借书需要先查询馆藏状态，确认图书可借后到对应书库取书，再凭校园卡或读者码在服务台或自助借还机办理借阅。借书前建议留意馆藏位置、可借状态和借阅期限。",
    confidence: "medium",
  },
  sources: [
    {
      id: "library-borrow-guide",
      title: "图书馆借阅与续借办理说明",
      type: "official",
      site: "校图书馆官网",
      excerpt:
        "读者可通过馆藏系统查询图书状态，持校园卡或读者码到服务台、自助借还机办理借阅与续借。",
      highlights: ["馆藏状态", "校园卡", "自助借还机"],
      url: null,
      score: 0.92,
    },
    {
      id: "library-peak-time",
      title: "图书馆借书高峰期要不要早点去",
      type: "student_experience",
      site: "校园生活问答社区",
      excerpt:
        "考试周和开学初借阅人数较多，热门书籍可能需要提前查询馆藏并尽早到馆。",
      highlights: ["考试周", "热门书籍", "提前查询"],
      url: null,
      score: 0.78,
    },
  ],
  relatedQuestions: ["图书馆自习座位怎么预约？", "借阅到期后还能续借吗？"],
  errorMessage: null,
};
