function HostContainer(os) {
    this.allowCardTitle = true;
    this.allowFacts = true;
    this.allowHeroImage = true;
    this.allowImages = true;
    this.allowActionCard = true;
    this.os = os;
}

function MessageCard(defaultCardConfig, compactCardConfig, os) {
    this.style = "default";
    this.defaultCardConfig = defaultCardConfig;
    this.compactCardConfig = compactCardConfig;
    this.hostContainer = new HostContainer(os);
}

MessageCard.prototype.parse = function (json) {
    this.summary = json["summary"];
    this.themeColor = json["themeColor"];
    this.style == "default";
    if (json["style"]) {
        this.style = json["style"];
    }
    this.hideOriginalBody = json["hideOriginalBody"];

    this._adaptiveCard = new AdaptiveCards.AdaptiveCard();
    this._adaptiveCard.preExpandSingleShowCardAction = true;
    if(this.style == "compact"){
        this._adaptiveCard.hostConfig = new AdaptiveCards.HostConfig(this.compactCardConfig);
    }
    else{
        this._adaptiveCard.hostConfig = new AdaptiveCards.HostConfig(this.defaultCardConfig);
    }

    if (json["title"] != undefined) {
        var textBlock = new AdaptiveCards.TextBlock();
        textBlock.text = json["title"];
        textBlock.size = 3;
        textBlock.wrap = true;
        textBlock.weight = 2;
        textBlock.spacing = 2;
        this._adaptiveCard.addItem(textBlock);
    }

    if (json["text"] != undefined) {
        var textBlock = new AdaptiveCards.TextBlock();
        textBlock.size = 2;
        textBlock.text = json["text"];
        textBlock.wrap = true;
        textBlock.spacing = 2;
        this._adaptiveCard.addItem(textBlock);
    }

    if (json["sections"] != undefined) {
        var sectionArray = json["sections"];
        for (var i = 0; i < sectionArray.length; i++) {
            var section = parseSection(sectionArray[i], this.hostContainer);
            this._adaptiveCard.addItem(section);
        }
    }
    if (json["potentialAction"] != undefined) {
        var actionSet = parseActionSet(json["potentialAction"], this.hostContainer);
        actionSet.actionStyle = "link";
        this._adaptiveCard.addItem(actionSet);
    }
};
MessageCard.prototype.render = function () {
    return this._adaptiveCard.render();
};

function parsePicture(json, defaultSize, defaultStyle) {
    if (defaultSize === void 0) { defaultSize = 3; }
    if (defaultStyle === void 0) { defaultStyle = 0; }
    var picture = new AdaptiveCards.Image();
    picture.url = json["image"];
    picture.size = json["size"] ? json["size"] : defaultSize;
    return picture;
}

function parseImageSet(json) {
    var imageSet = new AdaptiveCards.ImageSet();
    var imageArray = json;
    for (var i = 0; i < imageArray.length; i++) {
        var image = parsePicture(imageArray[i], 3);
        imageSet.addImage(image);
    }
    return imageSet;
}

function parseFactSet(json) {
    var mobileRender = new MessageCardRenderer();
    var factSet = new mobileRender.FactSet();
    var factArray = json;
    for (var i = 0; i < factArray.length; i++) {
        var fact = new AdaptiveCards.Fact();
        fact.name = factArray[i]["name"];
        fact.value = factArray[i]["value"];
        factSet.facts.push(fact);
    }
    return factSet;
}

function getUrlFromOS(os, targets) {
    return targets.filter(
        function(targets){return targets.os == os}
    );
}

function parseOpenUrlAction(json, host) {
    var action = new AdaptiveCards.OpenUrlAction();
    action.title = json["name"];
    if(json["targets"] != null) {
        //ToDo: Android
        var found = getUrlFromOS(host.os, json["targets"]);
        if(found.length >= 1)
        {
            action.url = found[0]["uri"];
        }
        else{
            found = getUrlFromOS("default", json["targets"])
            if(found.length >= 1)
            {
                action.url = found[0]["uri"];
            }
        }
    }
    return action;
}

function parseViewAction(json, host) {
    var action = new AdaptiveCards.OpenUrlAction();
    action.title = json["name"];
    if(json["target"] != null) {
        //ToDo: Android
        var found = getUrlFromOS(host.os, json["target"]);
        if(found.length >= 1)
        {
            action.url = found[0];
        }
        else{
            found = getUrlFromOS("default", json["target"])
            if(found.length >= 1)
            {
                action.url = found[0];
            }
        }
    }
    return action;
}

function parseHttpAction(json) {
    var mobileRender = new MessageCardRenderer();
    var action = new mobileRender.HttpAction();
    action.method = "POST";
    action.body = json["body"];
    action.title = json["name"];
    action.url = json["target"];
    action.id = json["@id"];
    return action;
}

function parseInvokeAddInCommandAction(json) {
    var action = new InvokeAddInCommandAction();
    action.title = json["name"];
    action.addInId = json["addInId"];
    action.desktopCommandId = json["desktopCommandId"];
    action.initializationContext = json["initializationContext"];
    return action;
}

function parseInput(input, json) {
    input.id = json["id"];
    input.defaultValue = json["value"];
}

function parseTextInput(json) {
    var input = new AdaptiveCards.TextInput();
    parseInput(input, json);
    input.placeholder = json["title"];
    input.isMultiline = json["isMultiline"];
    input.maxLength = json["maxLength"];
    return input;
}

function parseDateInput(json) {
    var input = new AdaptiveCards.DateInput();
    parseInput(input, json);
    return input;
}

function parseChoiceSetInput(json) {
    var input = new AdaptiveCards.ChoiceSetInput();
    parseInput(input, json);
    input.placeholder = json["title"];
    var choiceArray = json["choices"];
    if (choiceArray) {
        for (var i = 0; i < choiceArray.length; i++) {
            var choice = new AdaptiveCards.Choice();
            choice.title = choiceArray[i]["display"];
            choice.value = choiceArray[i]["value"];
            input.choices.push(choice);
        }
    }
    input.isMultiSelect = json["isMultiSelect"];
    input.isCompact = !(json["style"] === "expanded");
    return input;
}

function parseShowCardAction(json, host) {
    var showCardAction = new AdaptiveCards.ShowCardAction();
    showCardAction.title = json["name"];
    showCardAction.card.actionStyle = "button";
    var inputArray = json["inputs"];
    if (inputArray) {
        for (var i = 0; i < inputArray.length; i++) {
            var jsonInput = inputArray[i];
            var input = null;
            switch (jsonInput["@type"]) {
                case "TextInput":
                    input = parseTextInput(jsonInput);
                    break;
                case "DateInput":
                    input = parseDateInput(jsonInput);
                    break;
                case "MultiChoiceInput":
                case "MultichoiceInput":
                    input = parseChoiceSetInput(jsonInput);
                    break;
            }
            if (input) {
                showCardAction.card.addItem(input);
            }
        }
    }
    var actionArray = json["actions"];
    if (actionArray) {
        showCardAction.card.addItem(parseActionSet(actionArray, host));
    }
    return showCardAction;
}

function parseActionSet(json, host) {
    var actionSet = new AdaptiveCards.ActionSet();
    var actionArray = json;
    for (var i = 0; i < actionArray.length; i++) {
        var jsonAction = actionArray[i];
        var action = null;
        switch (jsonAction["@type"]) {
            case "OpenUri":
                action = parseOpenUrlAction(jsonAction, host);
                break;
            case "ViewAction":
                action = parseViewAction(jsonAction, host);
                break;
            case "HttpPOST":
                action = parseHttpAction(jsonAction);
                break;
            case "ActionCard":
                if (host.allowActionCard) {
                    action = parseShowCardAction(jsonAction, host);
                }
                break;
        }
        if (action) {
            actionSet.addAction(action);
        }
    }

    var items = actionSet._actionCollection.items;
    if(items.length > 3){
        var mobileRender = new MessageCardRenderer();
        var moreAction = new mobileRender.MoreAction();
        for (var i = 2; i < items.length; i++){
            moreAction.addAction(items[i]);
        }

        actionSet._actionCollection.items.splice(2,items.length - 2);
        actionSet.addAction(moreAction);
    }

    return actionSet;
}

function parseSection(json, host) {
    var section = new AdaptiveCards.Container();
    if (typeof json["startGroup"] === "boolean" && json["startGroup"]) {
        section.separator = true;
    }

    section.spacing = 2;

    if (json["title"] != undefined) {
        var textBlock = new AdaptiveCards.TextBlock();
        textBlock.text = json["title"];
        textBlock.size = 3;
        textBlock.wrap = true;
        textBlock.spacing = 2;
        section.addItem(textBlock);
    }
    if(json["style"] != null)
    {
        section.style = json["style"] == "emphasis" ? "emphasis" : "normal";
    }
    if (json["activityTitle"] != undefined || json["activitySubtitle"] != undefined ||
        json["activityText"] != undefined || json["activityImage"] != undefined) {
        var columnSet = new AdaptiveCards.ColumnSet();
        var column;
        // Image column
        if (json["activityImage"] != null) {
            column = new AdaptiveCards.Column();
            column.size = "auto";
            var image = new AdaptiveCards.Image();
            image.size = json["activityImageSize"] ? json["activityImageSize"] : 2;
            image.style = json["activityImageStyle"] ? json["activityImageStyle"] : 1;
            image.url = json["activityImage"];
            column.addItem(image);
            columnSet.addColumn(column);
        }
        // Text column
        column = new AdaptiveCards.Column;
        column.size = "stretch";
        if (json["activityTitle"] != null) {
            var textBlock_1 = new AdaptiveCards.TextBlock();
            textBlock_1.text = json["activityTitle"];
            textBlock_1.separation = "none";
            textBlock_1.wrap = true;
            textBlock_1.size = 2;
            textBlock_1.spacing = 2;
            column.addItem(textBlock_1);
        }
        if (json["activitySubtitle"] != null) {
            var textBlock_2 = new AdaptiveCards.TextBlock();
            textBlock_2.text = json["activitySubtitle"];
            textBlock_2.weight = "lighter";
            textBlock_2.isSubtle = false;
            textBlock_2.separation = "none";
            textBlock_2.wrap = true;
            textBlock_2.size = 1;
            textBlock_2.color = 1;
            textBlock_2.spacing = 0;
            column.addItem(textBlock_2);
        }
        if (json["activityText"] != null) {
            var textBlock_3 = new AdaptiveCards.TextBlock();
            textBlock_3.text = json["activityText"];
            textBlock_3.separation = "none";
            textBlock_3.size = 1;
            textBlock_3.wrap = true;
            textBlock_3.spacing = 0;
            column.addItem(textBlock_3);
        }
        columnSet.addColumn(column);
        section.addItem(columnSet);
    }
    if (host.allowHeroImage) {
        var heroImage = json["heroImage"];
        if (heroImage != undefined) {
            var image_1 = parsePicture(heroImage);
            image_1.size = 0;
            section.addItem(image_1);
        }
    }
    if (json["text"] != undefined) {
        var text = new AdaptiveCards.TextBlock();
        text.text = json["text"];
        text.size = 2;
        text.wrap = true;
        text.spacing = 2;
        section.addItem(text);
    }
    if (host.allowFacts) {
        if (json["facts"] != undefined) {
            var factGroup = parseFactSet(json["facts"]);
            section.addItem(factGroup);
        }
    }
    if (host.allowImages) {
        if (json["images"] != undefined) {
            var pictureGallery = parseImageSet(json["images"]);
            section.addItem(pictureGallery);
        }
    }
    if (json["potentialAction"] != undefined) {
        var actionSet = parseActionSet(json["potentialAction"], host);
        actionSet.actionStyle = "link";
        section.addItem(actionSet);
    }
    return section;
}