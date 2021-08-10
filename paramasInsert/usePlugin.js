const { transformFromAstSync } = require('@babel/core');
const parser = require('@babel/parser');

const insertParametersPlugin = require('./makePlugin.js');
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
const { code } = transformFromAstSync(ast, sourceCode, {
  plugins: [insertParametersPlugin],
});

console.log(code);
