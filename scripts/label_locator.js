class LabelLocator {
  static #getNodeText(node) {
    if (!node) return "";
    if (node.nodeType === 3) return node.textContent;
    return node.innerText || "";
  }

  static #getLeftSiblingsText(element) {
    let checkbox_or_radio = element.tagName == "INPUT" && ["checkbox", "radio"].includes(element.type);
    if (checkbox_or_radio && element.parentElement.tagName == "LABEL")
      element = element.parentElement;
    
    let text = "";
    let sibling = element.previousSibling;
    let rect = null;
    
    while (sibling) {
      let non_breaking_tag = ["EM", "STRONG", "SPAN", "I", "A"].includes(sibling.tagName);
      let breaking_tag = ["LABEL", "P", "DIV"].includes(sibling.tagName);
      
      if (sibling.nodeType == 8) {
        sibling = sibling.previousSibling;
        continue;
      }
      
      let nodeRect = this.#getNodeRect(sibling);
      let nodeText = this.#getNodeText(sibling);
      
      if (sibling.nodeType == 3) {
        if (nodeText.trim() != "") {
          rect = this.#mergeRects(rect, nodeRect);
          text = nodeText + text;
        }
      } else if (sibling.nodeType == 1) {
        if (text != "") {
          if (non_breaking_tag) {
            rect = this.#mergeRects(rect, nodeRect);
            text = nodeText + text;
          } else break;
        } else if (nodeText.trim() != "") {
          if (breaking_tag) {
            rect = this.#mergeRects(rect, nodeRect);
            text = nodeText;
            break;
          } else if (non_breaking_tag) {
            rect = this.#mergeRects(rect, nodeRect);
            text = nodeText;
          }
        }
      }
      sibling = sibling.previousSibling;
    }
    return { text: text.trim(), rect: rect };
  }

  static #mergeRects(rect1, rect2) {
    if (!rect1) return rect2;
    if (!rect2) return rect1;
    return {
      left: Math.min(rect1.left, rect2.left),
      top: Math.min(rect1.top, rect2.top),
      right: Math.max(rect1.right, rect2.right),
      bottom: Math.max(rect1.bottom, rect2.bottom)
    };
  }

  static #getNodeRect(node) {
    if (node.nodeType == 3) {
      let range = document.createRange();
      range.selectNodeContents(node);
      let rect = range.getBoundingClientRect();
      return rect;
    }
    return node.getBoundingClientRect();
  }

  static #checkLabelPosition(labelRect, inputElement) {
    let inputRect = inputElement.getBoundingClientRect();
    const verticalOverlap = Math.max(0, Math.min(labelRect.bottom, inputRect.bottom) - Math.max(labelRect.top, inputRect.top));
    const overlapPercentage = verticalOverlap / Math.min(labelRect.bottom - labelRect.top, inputRect.bottom - inputRect.top);
    const horizontalSpacing = inputRect.left - labelRect.right;

    const horizontalOverlap = Math.max(0, Math.min(labelRect.right, inputRect.right) - Math.max(labelRect.left, inputRect.left));
    const widthOverlapPercentage = horizontalOverlap / Math.min(labelRect.right - labelRect.left, inputRect.right - inputRect.left);
    const verticalSpacing = inputRect.top - labelRect.bottom;

    return (overlapPercentage >= 0.8 && horizontalSpacing > 0 && horizontalSpacing < 100) ||
            (widthOverlapPercentage >= 0.8 && verticalSpacing > 0 && verticalSpacing < 50);
  }

  static #findEnclosingLabel(elem) {
    while (elem.parentElement) {
      if (elem.parentElement.tagName == "LABEL")
        return this.#cleanUpLabel(this.#getLeftSiblingsText(elem).text);
      elem = elem.parentElement;
    }
    return "";
  }

  static #getAllTextNodes() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          if (node.textContent.trim() === '') {
            return NodeFilter.FILTER_REJECT;
          }
          if (node.parentElement && ['SCRIPT', 'STYLE'].includes(node.parentElement.tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    return textNodes;
  }

  static #cleanUpLabel(label) {
    if (!label) return "";
    label = label.replace("(required)", "").replace("\n", " ").trim().toLowerCase();
    label = label.replace(/[*:✱]$/, "");
    if (label.toLowerCase() == "please select") return "";
    if (label.match(/^\-+$/)) return "";
    return label;
  }

  static #getNextNonEmptySibling(element) {
    let sibling = element.nextSibling;
    while (sibling) {
      if (sibling.nodeType == 3 && sibling.textContent.trim() == "") sibling = sibling.nextSibling;
      else break;
    }
    return sibling;
  }

  static #findEnclosingElementByTagName(element, tagName) {
    element = element.parentElement;
    while (element) {
      if (element.tagName == tagName) return element;
      element = element.parentElement;
    }
    return null;
  }

  // Public methods
  static findAssociatedLabel(inputElement) {
    if (!inputElement) {
      console.log("Trying to find label for null element");
      return "";
    }

    let label = "";
    let tagName = inputElement.tagName;
    if (tagName == "INPUT" && inputElement.type == "email") return "email";
    if (tagName == "INPUT" && inputElement.type == "tel") return "phone";
    
    let checkbox_or_radio = tagName == "INPUT" && ["checkbox", "radio"].includes(inputElement.type)
      || tagName == "DIV" && inputElement.getAttribute("role") == "checkbox"
      || tagName == "DIV" && inputElement.getAttribute("role") == "radio";
    
    if (!checkbox_or_radio) {
      label = this.#findEnclosingLabel(inputElement);
      if (label) return label;
    }

    if (checkbox_or_radio && inputElement.parentElement.parentElement) {
      label = this.#findEnclosingLabel(inputElement.parentElement);
      if (label) return label;
    }

    const inputId = inputElement.id;
    if (inputId && !checkbox_or_radio) {
      let labelElem = document.querySelector(`label[for='${inputId}']`);
      if (labelElem) {
        label = this.#cleanUpLabel(labelElem.innerText);
        if (label) return label;
      }
    }

    if (inputElement.attributes.aria_label && !checkbox_or_radio) {
      label = this.#cleanUpLabel(inputElement.attributes.aria_label);
      if (label) return label;
    }

    let aria_labelledby = inputElement.getAttribute("aria-labelledby");
    if (aria_labelledby) {
      aria_labelledby = aria_labelledby.split(" ")[0];
      if (document.getElementById(aria_labelledby) && !checkbox_or_radio) {
        label = this.#cleanUpLabel(document.getElementById(aria_labelledby).innerText);
        if (label) return label;
      }
    }

    let textRect = this.#getLeftSiblingsText(inputElement);
    if (textRect.text != "" && this.#checkLabelPosition(textRect.rect, inputElement)) 
      return this.#cleanUpLabel(textRect.text);

    const nodes = this.#getAllTextNodes();
    let closestLeftNode = null;
    let closestLeftDistance = Infinity;
    let closestTopNode = null;
    let closestTopDistance = Infinity;

    nodes.forEach(node => {
      const nodeRect = this.#getNodeRect(node);
      if (node.parentElement && (node.parentElement.getBoundingClientRect().width <= 1 || node.parentElement.getBoundingClientRect().height <= 1)) 
        return;
      
      const inputRect = inputElement.getBoundingClientRect();

      const verticalOverlap = Math.max(0, Math.min(nodeRect.bottom, inputRect.bottom) - Math.max(nodeRect.top, inputRect.top));
      const overlapPercentage = verticalOverlap / Math.min(nodeRect.height, inputRect.height);
      const horizontalSpacing = inputRect.left - nodeRect.right;

      if (overlapPercentage >= 0.8 && horizontalSpacing > 0 && horizontalSpacing < 100 && nodeRect.height < inputRect.height * 2) {
        if (horizontalSpacing < closestLeftDistance && !checkbox_or_radio) {
          closestLeftDistance = horizontalSpacing;
          closestLeftNode = node;
        }
      }

      const horizontalOverlap = Math.max(0, Math.min(nodeRect.right, inputRect.right) - Math.max(nodeRect.left, inputRect.left));
      const widthOverlapPercentage = horizontalOverlap / Math.min(nodeRect.width, inputRect.width);
      const verticalSpacing = inputRect.top - nodeRect.bottom;

      if (widthOverlapPercentage >= 0.8 && verticalSpacing > 0 && verticalSpacing < 50) {
        if (verticalSpacing < closestTopDistance && nodeRect.left >= inputRect.left - 50) {
          closestTopDistance = verticalSpacing;
          closestTopNode = node;
        }
      }
    });

    if (closestLeftNode && closestTopNode) {
      if (this.#getNodeRect(closestLeftNode).width > 300) {
        label = closestTopNode.textContent;
      } else {
        label = closestLeftNode.textContent;
      }
    } else if (closestLeftNode) {
      label = closestLeftNode.textContent;
    } else if (closestTopNode) {
      label = closestTopNode.textContent;
    }

    if (label == "" && inputElement.tagName == "INPUT" && 
        (inputElement.type == "text" || inputElement.type == "email" || inputElement.type == "tel"))
      label = inputElement.placeholder;
    
    if (!label && !checkbox_or_radio) label = inputElement.id;
    if (!label) return "";
    
    return this.#cleanUpLabel(label);
  }

  static getRadioLabel(radio) {
    let label = "";
    if (radio.id) {
      let labelElem = document.querySelector(`label[for='${radio.id}']`);
      if (labelElem) label = labelElem.innerText;
    }
    if (radio.parentElement.tagName == "LABEL") {
      label = radio.parentElement.innerText;
    }
    if (!label) label = radio.getAttribute('aria-label');
    
    let enclosingLi = this.#findEnclosingElementByTagName(radio, "LI");
    if (enclosingLi) {
      label = enclosingLi.innerText;
    }
    if (!label) {
      if (radio.nextSibling) label = this.#getNodeText(this.#getNextNonEmptySibling(radio));
      else label = this.#getNodeText(this.#getNextNonEmptySibling(radio.parentElement));
    }
    if (!label) return "";
    return this.#cleanUpLabel(label);
  }

  static getCheckboxLabel(checkbox) {
    return this.getRadioLabel(checkbox);
  }

  static findRadioGroupLabel(firstRadio) {
    return this.findAssociatedLabel(firstRadio);
  }

  static textBetweenCheckboxes(checkbox1, checkbox2) {
    let rect1 = checkbox1.getBoundingClientRect();
    let rect2 = checkbox2.getBoundingClientRect();
    const nodes = this.#getAllTextNodes();
    for (let node of nodes) {
      let nodeRect = this.#getNodeRect(node);
      if (nodeRect.top > rect1.bottom && nodeRect.bottom < rect2.top && 
          nodeRect.left < rect1.left + 5 && nodeRect.right > rect2.right) 
        return true;
    }
    return false;
  }
}
