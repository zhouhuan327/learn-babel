const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const types = require('@babel/types');
const template = require('@babel/template');
// 变成插件
const targetCalleeName = ['log', 'info', 'error', 'debug'].map(
  (item) => `console.${item}`
);
const insertCodeBeforeConsole = (path) => {
  // 用isNew判断是否是新节点,是的话就跳过这次遍历
  if (path.node.isNew) {
    return;
  }
  // 当前节点换成转换成代码
  const calleeName = generate(path.node.callee).code;
  if (targetCalleeName.includes(calleeName)) {
    const { line, column } = path.node.loc.start;
    // 生成ast节点
    const newNode = template.expression(
      `console.log("filename: (${line}, ${column})")`
    )();
    // 标记为新节点
    newNode.isNew = true;
    // 判断是否是jsx元素
    // jsx中只支持写单个表达式,所以得把整体换成一个数组表达式
    if (path.findParent((path) => path.isJSXElement())) {
      path.replaceWith(types.arrayExpression([newNode, path.node]));
      path.skip();
    } else {
      path.insertBefore(newNode);
    }
  }
};
module.exports = function ({ types, template }) {
  return {
    visitor: {
      CallExpression(path, state) {
        insertCodeBeforeConsole(path);
      },
    },
  };
};
