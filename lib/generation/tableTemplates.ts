/**
 * Table Templates for Structured Output
 * 
 * This file contains reusable table templates that can be referenced
 * in prompts to guide AI in generating well-structured multi-dimensional tables.
 */

/**
 * Template for Q7 (Course Objectives) - Stage-by-Dimension Table
 * Used to guide AI in generating the "分学段目标明细表"
 */
export const Q7_STAGE_DIMENSION_TABLE_TEMPLATE = `
**分学段目标明细表格式要求：**

请严格按照以下表格结构输出，每个单元格内容控制在50字以内：

| 学段 | 品德高尚(德) | 博学善思(智) | 身心健康(体) | 逐雅乐创(美) | 知行合一(劳) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 萌芽(1-2年级) | **知识**：[描述]<br>**理解**：[描述]<br>**实践**：[描述] | ... | ... | ... | ... |
| 蕴蕾(3-4年级) | **知识**：[描述]<br>**理解**：[描述]<br>**实践**：[描述] | ... | ... | ... | ... |
| 绽放(5-6年级) | **知识**：[描述]<br>**理解**：[描述]<br>**实践**：[描述] | ... | ... | ... | ... |

**注意事项：**
1. 每个学段的目标应体现螺旋式上升
2. 使用简洁、可操作的动词开头（如"掌握"、"理解"、"运用"）
3. 学段命名应与核心隐喻保持一致
`;

/**
 * Template for Q10 (Evaluation System) - Dimension-Stage Evaluation Table
 * Used to guide AI in generating the evaluation criteria tables
 */
export const Q10_EVALUATION_TABLE_TEMPLATE = `
**评价维度明细表格式要求：**

请为每个维度生成详细的评价表格：

| 对应维度&奖章 | 评价要点 | 评价方式（含争章机制） |
| :--- | :--- | :--- |
| [维度名称]([奖章名称]) | 1. [评价要点1]<br>2. [评价要点2]<br>3. [评价要点3] | • [过程性评价方式]<br>• [终结性评价方式]<br>• [激励机制] |

**分学段评价目标表：**

| 学段 | 课程目标 | 评价要点 | 评价方式（含争章机制） |
| :--- | :--- | :--- | :--- |
| 1-2年级 | **生根(知识)**：[描述]<br>**生长(理解)**：[描述]<br>**生活(实践)**：[描述] | • [具体表现] | • [具体评价方式]<br>• [奖章兑换规则] |
| 3-4年级 | ... | ... | ... |
| 5-6年级 | ... | ... | ... |

**注意事项：**
1. 评价方式要具体、可操作
2. 争章机制要明确（如"每周3张贴纸换取奖章"）
3. 体现过程性评价与终结性评价的结合
`;

/**
 * Template for curriculum structure tables
 */
export const CURRICULUM_STRUCTURE_TABLE_TEMPLATE = `
**课程结构表格式要求：**

| 课程群 | 国家课程 | 校本化实施课程 | 校本社团课程 | 研学课程 |
| :--- | :--- | :--- | :--- | :--- |
| [课程群1] | [学科列表] | [品牌课程名称] | [社团列表] | [研学主题] |
| [课程群2] | [学科列表] | [品牌课程名称] | [社团列表] | [研学主题] |
| ... | ... | ... | ... | ... |

**注意事项：**
1. 国家课程列明具体学科名称
2. 校本课程要体现学校特色
3. 社团和研学要与核心隐喻呼应
`;

export default {
    Q7_STAGE_DIMENSION_TABLE_TEMPLATE,
    Q10_EVALUATION_TABLE_TEMPLATE,
    CURRICULUM_STRUCTURE_TABLE_TEMPLATE,
};
