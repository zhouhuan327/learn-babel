const { declare } = require('@babel/helper-plugin-utils');
const importModule = require('@babel/helper-module-imports');
const path = require('path');

const autoTracePlugin = declare((api, options) => {
  return {
    visitor: {
      Program: {
        enter: (path, state) => {
          //判断监控包是非被引用
          path.traverse({
            ImportDeclaration(curPath) {
              const requirePath = curPath.get('source').node.value;
              if (requirePath === options.trackerPath) {
                const specifierPath = curPath.get('specifiers.0');
                if (specifierPath.isImportSpecifier()) {
                  state.trackerImportId = specifierPath.toString();
                } else if (specifierPath.isImportNamespaceSpecifier()) {
                  state.trackerImportId = specifierPath.get('local').toString();
                }
                path.stop();
              }
            },
          });
          if (!state.trackerImportId) {
            state.trackerImportId = importModule.addDefault(path, 'tracker', {
              nameHint: path.scope.generateUid('tracker'),
            }).name; // tracker 模块的 id
            state.trackerAST = api.template.statement(`${state.trackerImportId}()`)(); // 埋点代码的 AST
          }
        },
      },
      // 插桩
      'ClassMethod|ArrowFunctionExpression|FunctionExpression|FunctionDeclaration'(
        path,
        state
      ) {
        const bodyPath = path.get('body');
        if (bodyPath.isBlockStatement()) {
          // 有函数体就在开始插入埋点代码
          bodyPath.node.body.unshift(state.trackerAST);
        } else {
          // 没有函数体要包裹一下，处理下返回值
          const ast = api.template.statement(
            `{${state.trackerImportId}();return PREV_BODY;}`
          )({ PREV_BODY: bodyPath.node });
          bodyPath.replaceWith(ast);
        }
      },
    },
  };
});
module.exports = autoTracePlugin;
