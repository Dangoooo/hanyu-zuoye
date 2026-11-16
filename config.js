// ===== 老师只需要改这个文件 =====
window.HW_CONFIG = {
  // 部署 Google Apps Script 后得到的网址（以 /exec 结尾），粘贴到引号里。
  // 留空时为“演示模式”：答案只存在本机浏览器里，用来自己试用。
  API_URL: "https://script.google.com/macros/s/AKfycbycW4f1UqFHGJtUIPQ5OvXSzCHyhMb6P2CxyxEF9Zd5HQRBdD1Nvncc7zmREQD2Eh18/exec",

  // 班级名称，显示在页面顶部
  CLASS_NAME: "HSK3 汉语班",

  // 学生名单：填了以后学生从下拉框选名字，不会打错字；留空 [] 则学生自己输入名字。
  // 例如：STUDENTS: ["Nguyễn Văn An", "Lê Thị Hoa", "Trần Minh"],
  STUDENTS: [],

  // 学生交卷后是否显示正确答案。false = 只显示对错，由老师讲解。
  SHOW_ANSWERS: false,

  // 作业列表：每加一课，在这里加一行（id 要和 lessons 文件夹里的文件名一致）
  LESSONS: [
    { id: "lesson01", title: "第1课 我们去机场接你们" }
  ]
};
