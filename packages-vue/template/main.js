const State = {
    initial: 1, // 初始状态
    tagOpen: 2, // 标签开始状态
    tagName: 3, // 标签名称状态
    text: 4, // 文本状态
    tagEnd: 5, // 标签结束状态
    tagEndName: 6, // 标签结束名称状态
};

const TokenType = {
    tag: "tag", // 标签
    text: "text", // 文本
    tagEnd: "tagEnd", // 标签结束
};

function isAlpha(char) {
    return (char >= "a" && char <= "z") || (char >= "A" && char <= "Z");
}

export function tokenize(str) {
    let currentState = State.initial;
    const chars = [];
    const tokens = [];
    while(str) {
        const char = str[0];
        switch(currentState) {
        case State.initial:
            if(char === "<") {
                currentState = State.tagOpen;
                str = str.slice(1);
            } else if(isAlpha(char)) {
                currentState = State.text;
                chars.push(char);
                str = str.slice(1);
            }
            break;
        case State.tagOpen:
            if(isAlpha(char)) {
                currentState = State.tagName;
                chars.push(char);
                str = str.slice(1);
            } else if(char === "/") {
                currentState = State.tagEnd;
                str = str.slice(1);
            }
            break;
        case State.tagName:
            if(isAlpha(char)) {
                chars.push(char);
                str = str.slice(1);
            } else if(char === ">") {
                currentState = State.initial;
                tokens.push({ type: TokenType.tag, name: chars.join("") });
                chars.length = 0;
                str = str.slice(1);
            }
            break;
        case State.text:
            if(isAlpha(char)) {
                chars.push(char);
                str = str.slice(1);
            } else if(char === "<") {
                currentState = State.tagOpen;
                tokens.push({ type: TokenType.text, content: chars.join("") });
                chars.length = 0;
                str = str.slice(1);
            }
            break;
        case State.tagEnd:
            if(isAlpha(char)) {
                currentState = State.tagEndName;
                chars.push(char);
                str = str.slice(1);
            }
            break;
        case State.tagEndName:
            if(isAlpha(char)) {
                chars.push(char);
                str = str.slice(1);
            } else if(char === ">") {
                currentState = State.initial;
                tokens.push({ type: TokenType.tagEnd, name: chars.join("") });
                chars.length = 0;
                str = str.slice(1);
            }
            break;
        }
    }
    return tokens;
}

/**
 *
 * @param {string} str
 * @returns
 */
export function parse(str) {
    const tokens = tokenize(str);
    const root = {
        type: "Root",
        children: [],
    };
    const elementStack = [root];
    while(tokens.length) {
        const parent = elementStack[elementStack.length - 1];
        const t = tokens[0];
        switch(t.type) {
        case TokenType.tag:
            const elementNode = {
                type: "Element",
                tag: t.name,
                children: [],
            };
            parent.children.push(elementNode);
            elementStack.push(elementNode);
            break;
        case TokenType.text:
            const textNode = {
                type: "Text",
                content: t.content,
            };
            parent.children.push(textNode);
            break;
        case TokenType.tagEnd:
            elementStack.pop();
            break;
        }
        tokens.shift();
    }
    return root;
}

export function dump(node, indent = 0) {
    // 节点的类型
    const type = node.type;
    // 节点的描述，如果是根节点，则没有描述
    // 如果是 Element 类型的节点，则使用 node.tag 作为节点的描述
    // 如果是 Text 类型的节点，则使用 node.content 作为节点的描述
    const desc = node.type === "Root"
        ? ""
        : node.type === "Element"
            ? node.tag
            : node.content;

    // 打印节点的类型和描述信息
    console.log(`${"-".repeat(indent)}${type}: ${desc}`);

    // 递归地打印子节点
    if(node.children) {
        node.children.forEach(n => dump(n, indent + 2));
    }
}
