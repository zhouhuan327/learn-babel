const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const types = require('@babel/types');
const template = require('@babel/template');
// 在console前插入一个console,打印信息
const sourceCode = `
    console.log(1);

    function func() {
        console.info(2);
    }

    export default class Clazz {
        say() {
            console.debug(3);
        }
        render() {
            return <div>{console.error(4)}</div>
        }
    }
`;
const ast = parser.parse(sourceCode, {
  sourceType: 'unambiguous',
  plugins: ['jsx'],
});
const targetCalleeName = ['log', 'info', 'error', 'debug'].map(
  (item) => `console.${item}`
);
// 直接在console里面添加参数
const insertParamToConsole = (path) => {
  const calleeName = generate(path.node.callee).code;
  if (targetCalleeName.includes(calleeName)) {
    const { line, column } = path.node.loc.start;
    path.node.arguments.unshift(types.stringLiteral(`filename: (${line}, ${column})`));
  }
};
// 在上一行
const insertCodeBeforeConsole = (path) => {
  console.log(path.scope.bindings);
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
// 遍历ast
traverse(ast, {
  CallExpression(path, state) {
    insertCodeBeforeConsole(path);
  },
});

const { code, map } = generate(ast);
// console.log(code);
