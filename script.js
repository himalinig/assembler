
class Svg {
    constructor(element, activeLayer, layerInfo) {
        this.name = "svg"
        this.uniqueID = 1;
        this.element = element;
        this.tempElems = [];
        this.layerSelected = activeLayer;
        this.layers = {};
        this.text = {};
        this.layerColors = {};
        this.layerInfo = layerInfo;
        this.layerInfo.forEach(layer => {
            this.layers[layer.name] = {};
            this.layerColors[layer.name] = layer.color;
        });
    }
    changeElement(parentElement){
        Object.entries(this.layers).forEach(([_, layer]) => {
            Object.entries(layer).forEach(([_, line]) =>{
                line.destroyParent(this.element.id);
                line.addToParentElement(parentElement);
            });
        });
        this.tempElems.forEach(elem =>{
            elem.destroyParent(this.element.id);
            elem.addToParentElement(parentElement);
        });
        Object.entries(this.text).forEach(([_, elem])=> {
            elem.destroyParent(this.element.id);
            elem.addToParentElement(parentElement);
        });
        this.element = parentElement;
    }
    clearLayer(layerName){
        var ids = Object.keys(this.layers[layerName]);
        this.deleteIDs(ids);
    }
    
    validID(){
        var ID = this.uniqueID;
        this.uniqueID += 1;
        return ID;
    }
 
    getLayer(layerName){
        return Object.entries(this.layers[layerName]).map(([_, line]) => line);

    }
    addText(point, text, pointIsRelative=false, lineID){
        var color = this.layerColors[this.layerSelected];
        var relativePoint;
        if(pointIsRelative){
            relativePoint = point;
        } else{
            relativePoint = relativeMousePosition(point, this.element);
        }
        var textObj = new TextSVG(relativePoint,  this.genTextID(lineID),  text, color)
        textObj.addToParentElement(this.element);
        this.text[textObj.id] = textObj;
        return textObj.id;
    }
    addLine(point, pointIsRelative=false, closed=false){
        var color = this.layerColors[this.layerSelected];
        var line = new Line(this.validID(), closed, color);
        var relativePoint;
        if(pointIsRelative){
            relativePoint = point;
        } else{
            relativePoint = relativeMousePosition(point, this.element);
        }
        
        line.appendPoint(relativePoint);
        line.addToParentElement(this.element);
        this.layers[this.layerSelected][line.id] = line;
        return line.id;
    }
 
    reRender(){
        Object.entries(this.layers).forEach(([_, layer]) => {
            Object.entries(layer).forEach(([_, line]) =>{
                line.reRender();
            });
        });
        this.tempElems.forEach(elem =>{
            elem.reRender();
        });
        Object.entries(this.text).forEach(([_, elem])=> {
            elem.reRender();
        })
    }
 
    getLayerAssembler(layer){
        return Object.entries(this.layers[layer]).map(([_, line]) => {
            return line.points;
        })
    }
    getLine(lineID){
        return this.layers[this.layerSelected][lineID];
    }
    genTextID(lineID){
        return lineID + "_text";
    }
    getText(lineID){
        if(this.genTextID(lineID) in this.text){
            return [true, this.text[this.genTextID(lineID)]];
        }
        return [false, this.text[this.genTextID(lineID)]]
    }
    updateSvgPath(point, lineID, pointIsRelative=false) {
        var relativePoint;
        if(pointIsRelative){
            relativePoint = point;
        } else{
            relativePoint = relativeMousePosition(point, this.element);
        }
        this.layers[this.layerSelected][lineID].appendPoint(relativePoint);
        return lineID;
    }
    clearTemp(){
        this.tempElems.forEach(elem => elem.destroy());
        this.tempElems = [];
    }

    moveLines(lines, vec){
        lines.map(line => {
            line.moveByVector(vec)
        });
        lines.forEach(line  => {
            if(this.genTextID(line.id) in this.text){
                this.text[this.genTextID(line.id)].moveByVector(vec);
            }
        })
    }
    getLinesInPoint(point){
        var selected = Object.entries(this.layers[this.layerSelected]).reduce((acc, [_,curLine]) => {
            if(curLine.pointInRect(point)){
                acc.push(curLine)
            }
            return acc;
        }, []);
        return selected;
    }
    getLinesInRect(rect){
        var selected = Object.entries(this.layers[this.layerSelected]).reduce((acc, [_,curLine])=> {
            if(curLine.inRect(rect)){
                acc.push(curLine)
            }
            return acc;
        }, []);
        return selected;
    }
    getClosestLine(point){
        var relativePoint = relativeMousePosition(point, this.element);
        var closestLine = Object.entries(this.layers[this.layerSelected]).reduce((acc, [_,curLine])=> {
            var distance = minDistanceToLine(relativePoint, curLine.points);
            if( distance < acc.distance ){
                acc.distance = distance;
                acc.line = curLine;
            }
            return acc;
        }, {distance: Infinity, line: null});
        return closestLine;
    }
    computeAverage(lineID){
        var points = this.getLine(lineID).points;
        var pointSum = {
            x: points[0].x + points[1].x, 
            y: points[0].y + points[1].y
        }
        var x = Math.abs(points[0].x - points[1].x)
        var y = Math.abs(points[0].y - points[1].y)
        const length = Math.sqrt(x * x + y * y);
        const average = {
            x: pointSum.x / 2.0,
            y: pointSum.y / 2.0
        }  
        return [average, length];
    }
    deleteIDs(IDs){
        IDs.forEach(id =>{
            if(this.genTextID(id) in this.text){
                this.text[this.genTextID(id)].destroy();
                delete this.text[this.genTextID(id)];
            }
            if(id in this.layers[this.layerSelected]){
                this.layers[this.layerSelected][id].destroy();
                delete this.layers[this.layerSelected][id];
            }
        });
    }
    checkMembership(ID){
        if(ID in this.layers[this.layerSelected]){
            return true;
        }
        return false;
    }
   
    fromJSON(jsonObj){
        this.name = jsonObj.name
        this.uniqueID = jsonObj.uniqueID 
        this.tempElems = [];
        this.layers = {};
        this.text = {};
        this.layerInfo = jsonObj.layerInfo;
        this.layerInfo.forEach(layer => {
            this.layers[layer.name] = {};
            this.layerColors[layer.name] = layer.color;
        });
        Object.entries(jsonObj.layers).forEach(([layerKey, layerJSON]) => {
            Object.entries(layerJSON).forEach(([lineID, lineJSON]) =>{
                var line = new Line("");
                line.jsonToObj(lineJSON);
                this.layers[layerKey][lineID] = line;
                this.element.appendChild(line.path);
            });
        });
        Object.entries(jsonObj.text).forEach(([textID, textJSON]) =>{
            var text = new TextSVG(textJSON.point, "", textJSON.text);
            this.text[textID] = text;
            text.fromJSON(textJSON);
            this.element.appendChild(text.text);
        })
    }
    
}

class OutlineMode{
    constructor(svg, selectpoints){
        this.outlineID = null;
        this.svg = svg;
        this.selectpoints = selectpoints;
        this.selectingPoints = false;
        this.errorcolor = "#FF0000"
    }
    mouseDownHandler(e){
        this.selectingPoints = this.selectpoints.clickInPoint(e);
        if(this.selectingPoints){
            this.selectpoints.mouseDownHandler(e);
            return;
        }

        if(!this.svg.checkMembership(this.outlineID)){
            this.outlineID = this.svg.addLine(e, false, true);
            this.selectpoints.reset();
            this.selectpoints.initSelection( this.outlineID);
        }
        this.svg.updateSvgPath(e, this.outlineID);
    }
    mouseMoveHandler(e){
        if(this.selectingPoints){
            this.selectpoints.mouseMoveHandler(e);
            return;
        }
        
        this.svg.getLine(this.outlineID).removePoint();
        this.svg.updateSvgPath(e, this.outlineID);
       
    }
    errorCheck(){
        var points = this.svg.getLine(this.outlineID).points;
        var closePoint = this.svg.getLine(this.outlineID).closePoint;
        if(closePoint == null){
            console.error("outline does not have a close point");
            return;
        }
        points.push(closePoint);
        for(var i = 0; i < points.length - 1; i++){
            var p1 = points[i];
            var p2 = points[i + 1];
            
        }
    }
    mouseUpHandler(){
        if(this.selectingPoints){
            this.selectpoints.mouseUpHandler();
            return;
        }
        if(this.svg.checkMembership(this.outlineID)){
            this.selectpoints.initSelection(this.outlineID);
        }
    }
}
function relativeMousePosition(point, element){
    var parentRect = element.getBoundingClientRect();
    var p = {
        x: point.x - parentRect.left,
        y: point.y - parentRect.top
    }
    return p;
}
function downloadSVG(element=null, fileName=null){
    if(element == null){
        element = svg.element;
        fileName = svg.name;
    }

    var preface = '<?xml version="1.0" standalone="no"?>\r\n';
    var svgBlob = new Blob([preface, element.outerHTML], {type:"image/svg+xml;charset=utf-8"});
    var downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(svgBlob);
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
} 


class ConstructionMode {
    constructor(svg){
        this.curLineID = null;
        this.svg = svg;
    }
    mouseDownHandler(e){
        this.curLineID = this.svg.addLine(e);
    }
    mouseMoveHandler(e){
        this.svg.updateSvgPath(e, this.curLineID);
    }
    mouseUpHandler(){

    }
}

class OrientLineMode{
    constructor(svg, selectpoints){
        this.svg = svg;
        this.baseID = null;
        this.selectpoints = selectpoints;
        this.selectingPoints = false;
    }
    reComp(lineID){
        const [average, length] =  this.svg.computeAverage(lineID);
        this.svg.getLine(lineID).removePoint();
        var [b, text] = this.svg.getText(lineID);
        if(b){
            text.point = average;
            text.txt = Math.trunc(length).toString();
        }
        this.svg.updateSvgPath(average, lineID, true);
    }
    mouseDownHandler(e){
        // weird line edge cases
        if(this.baseID != null && this.svg.checkMembership(this.baseID) == false){
            this.svg.deleteIDs([this.baseID]);
            this.baseID = null;
        }
        
        this.selectingPoints = this.selectpoints.clickInPoint(e);

        if(this.selectingPoints){
            this.selectpoints.mouseDownHandler(e);
            return;
        }

        if(this.baseID == null){
            this.selectpoints.reset();
            this.baseID = this.svg.addLine(e);
            this.svg.updateSvgPath(e, this.baseID);
            this.selectpoints.initSelection(this.baseID);
        }       
    }
    mouseMoveHandler(e){
 
        if(this.baseID != null && this.svg.checkMembership(this.baseID) == false){
            this.baseID = null;
        }
        if(this.selectingPoints){
            this.selectpoints.mouseMoveHandler(e);
            return;
        }

        if(this.baseID != null){
            this.svg.getLine(this.baseID).removePoint();
            this.svg.updateSvgPath(e, this.baseID);
        }
    }
    mouseUpHandler(){
        if(this.selectingPoints){
            this.selectpoints.mouseUpHandler();
            return;
        }
        // edge case checking;
        if(this.baseID != null && this.svg.checkMembership(this.baseID) == false){
            this.baseID = null;
            return;
        } else if(this.baseID == null){
            return;
        }

        this.selectpoints.initSelection(this.baseID);  
        if(this.svg.getLine(this.baseID).points.length < 2){
            
            this.svg.deleteIDs([this.baseID]);
            this.baseID = null;
        } else if(this.svg.getLine(this.baseID).points.length == 2){
            var [average, length]  = this.svg.computeAverage(this.baseID);
            this.svg.updateSvgPath(average, this.baseID, true);
            this.svg.addText(average, Math.trunc(length).toString(), true, this.baseID);
            this.baseID = null;
        }
    }
}


function setup(passedSVG=null){
    var svgElementNS = SVGElement(width, height, width, height, svgClass, svgID);
    var svgContainer = document.getElementById("svg-container");
    
    svgContainer.innerHTML = "";
    svgContainer.appendChild(svgElementNS);
    svgElement = document.getElementById(svgID);
    mode = document.getElementById("mode");

    svg = new Svg(svgElement, LAYERSELECTED, layerInfo);
    if(passedSVG != null){
        svg = passedSVG;
        svg.changeElement(svgElement);
    }
    selectpointsmode = new SelectPoints(svg);
    var orientlinemode = new OrientLineMode(svg, selectpointsmode, svgElement);
    selectpointsmode.orientlinemode = orientlinemode;
    select = new Select(svg, selectpointsmode);
    layerthumbnails = new SvgUI(layerInfo, svg, select, width, height, thumbnailWidth, thumbnailHeight, thumbnailDivClass, layerDivID, modeInfo, clearicon,  selectedCSS);
    var outlinemode = new OutlineMode(svg, selectpointsmode);
    var constructionmode = new ConstructionMode(svg);
    var eventMap = {};


    eventMap[drawMode] = {};
    eventMap[selectMode] = {};
    eventMap[drawMode][constructionLayer] = constructionmode;
    eventMap[drawMode][outlineLayer] = outlinemode;
    eventMap[drawMode][orientLayer] = orientlinemode;
    eventMap[selectMode][constructionLayer] = select;
    eventMap[selectMode][outlineLayer] = select;
    eventMap[selectMode][orientLayer] = select;
    
    const mouseDown = (e) => {
        pressed = true;
        eventMap[SETMODE][LAYERSELECTED].mouseDownHandler(e);
    }
    const mouseMove = (e) =>{
        if(pressed){
            eventMap[SETMODE][LAYERSELECTED].mouseMoveHandler(e);
        }
    }
    const mouseUp = () =>{
        pressed = false;
        eventMap[SETMODE][LAYERSELECTED].mouseUpHandler();
        layerthumbnails.reRenderLayer(svg.layerSelected);
    }
    
    const doubleClick = (e) => {
        if(SETMODE == selectMode){
            select.doubleClickHandler(e);
        }
    }
    
    svgElement.addEventListener("mousedown", mouseDown);
    svgElement.addEventListener("mousemove", mouseMove);
    svgElement.addEventListener("mouseup", mouseUp);
    svgElement.addEventListener("dblclick", doubleClick);
    $("#" + svgID).mouseleave(function () {
        mouseUp()
    });
    // $("#" + svgID).mouseenter(function (e) {
    //     mouseDown(e)
    // });
    $(document).keyup(function(e){
        if(e.key === "Backspace") {
            select.deleteSelected();
        }
    });
}

function rerenderAssemblage(){
    assemblerElement = assemblerSetup(thumbnailsobj.export());
}


function SVGElement(boxWidth=600 , boxHeight=400,viewBoxWidth = 100, viewBoxHeight=75,  htmlClass="svg", id){
    var xmlns = "http://www.w3.org/2000/svg";
    var svgElem = document.createElementNS(xmlns, "svg");
    svgElem.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgElem.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    svgElem.setAttributeNS(null, "viewBox", "0 0 " + boxWidth + " " + boxHeight);
    svgElem.setAttributeNS(null, "width", viewBoxWidth);
    svgElem.setAttributeNS(null, "height", viewBoxHeight);
    svgElem.setAttributeNS(null, "id", id);
    svgElem.setAttributeNS(null, "class", htmlClass)
    return svgElem;
}
function makeDiv(id, text="", classCSS=""){
    
    var block_to_insert = document.createElement( 'div' );
    block_to_insert.id = id;
    
    block_to_insert.innerHTML = text;
    block_to_insert.setAttributeNS(null, "class",  classCSS);

    return block_to_insert;
}
function makeButton(text){
    var button = document.createElement( 'button' );
    button.innerHTML = text
    return button
}

class SvgUI{
    constructor(layerInfo, svg, select, width, height, thumbnailWidth, thumbnailHeight, thumbnailDivClass, layerDivID, modeInfo, clearicon, selectedCSS){
        this.svg = svg;
        this.select = select;
        this.layerElements = {};
        this.layerDivElements= {};
        this.width = width;
        this.heigth =  height;
        this.thumbnailWidth =  thumbnailWidth;
        this.thumbnailHeight = thumbnailHeight;
        this.thumbnailDivClass = thumbnailDivClass;
        this.layerDivID = layerDivID;
        this.icon = clearicon;
        this.selectedCSS = selectedCSS
        this.layerDivElement =  document.getElementById(this.layerDivID)
        this.modeButtons = {}
        this.modeEventListener = {}
        this.destroyLambda = () => {
            var layerContainer = document.getElementById(this.layerDivID);
            layerContainer.innerHTML = ""
        }
        modeInfo.forEach(mode =>{
            var modeButton = document.getElementById(mode.modeButtonDivID);
            this.modeButtons[mode.modeName] = modeButton;
            var modeEventListener = this.changeModeLambda(mode.modeName,modeButton);
            modeButton.onclick = modeEventListener;
            this.modeEventListener[mode.modeName] = modeEventListener;
        })
        layerInfo.forEach(layer => {
            var thumbnailElemNS = SVGElement(width, height, thumbnailWidth, thumbnailHeight, "svg", layer.name);
            var thumbnailDIV = makeDiv(thumbnailElemNS.id + "_container", layer.name, this.thumbnailDivClass);
            var clearButton = makeButton(this.icon + " clear layer");
            thumbnailDIV.appendChild(thumbnailElemNS);
            thumbnailDIV.appendChild(clearButton);
            this.layerDivElement.append(thumbnailDIV);
            var thumbnailElem = document.getElementById(layer.name);
            this.layerElements[layer.name] = thumbnailElem;
            this.layerDivElements[layer.name] = thumbnailDIV;
            this.layerDivs
            thumbnailDIV.addEventListener("mousedown", this.changeLayerLambda(layer.name, thumbnailDIV ), false, );
            clearButton.onclick = this.clearLayerLambda(layer.name);
        });
    }
    changeModeLambda(modeName, modeButton){
        const changeMode = e =>{
            Object.entries(this.modeButtons).forEach(([_, div]) =>div.classList.remove(this.selectedCSS))
            modeButton.classList.add(this.selectedCSS);
            this.select.resetSelection();
            SETMODE = modeName;
            
        }
        return changeMode;
    }
    changeLayerLambda(name, thumbnailDIV ){
        const changeSVGLayer = e =>{
            this.select.resetSelection();
            LAYERSELECTED = name;
            Object.entries(this.layerDivElements).forEach(([_, div]) => div.classList.remove(this.selectedCSS))
            thumbnailDIV.classList.add(this.selectedCSS);
            this.svg.layerSelected = name;
        }
        return changeSVGLayer;
    }
    clearLayerLambda(name){
        const clearSVGLayer = (e) => {
            this.svg.clearLayer(name);
            this.svg.reRender();
            this.reRenderLayer(name);
        };
        return clearSVGLayer
    }
    destroy(){
        var layerContainer = document.getElementById(this.layerDivID);
        layerContainer.innerHTML = ""
    }
  
    reRenderLayer(layerName){
        var lines = this.svg.getLayer(layerName);
        var thumbnailElement = this.layerElements[this.svg.layerSelected]
        lines.forEach(line => {
            line.addToParentElement(thumbnailElement);
        });
    }
}



class Thumbnails{
    constructor(width, height, thumbnailWidth, thumbnailHeight, thumbnailDivClass, thumbnailDiv, trashIcon, saveIcon, editIcon, resetLambda,  sessionStorageKey){
        this.thumbnailDivID = thumbnailDiv;
        this.thumbnails = {};
        this.numberID = 0;
        this.width = width;
        this.heigth =  height;
        this.thumbnailWidth =  thumbnailWidth;
        this.thumbnailHeight = thumbnailHeight;
        this.thumbnailDivClass = thumbnailDivClass;
        this.trashicon = trashIcon;
        this.saveicon = saveIcon;
        this.editicon = editIcon;
        this.thumbnailDivs = {};
        this.sessionStorageKey = sessionStorageKey;
        this.resetLambda = resetLambda;
        this.downloadProjectButton =  makeButton("project save");
        this.downloadProjectButton.onclick = this.downloadProjectLambda(); 
        // sessionStorage.removeItem(this.sessionStorageKey);
        if(sessionStorage.getItem(this.sessionStorageKey)){
            this.loadFromSessionStorage();
        }
         
    }
    loadFromSessionStorage(){
        var project = JSON.parse(sessionStorage.getItem(this.sessionStorageKey));
        Object.entries(project).forEach(([key, svgJSON], index) => {
            var svgElement = SVGElement(width, height, width, height, "svg", index.toString());
            var svgClass = new Svg(svgElement, LAYERSELECTED, layerInfo);
            svgClass.fromJSON(svgJSON)
            this.addThumbnail(svgClass);
        })
        this.render();

    }
    addThumbnail(svg){
        this.numberID += 1;
        var id = this.numberID.toString() + "_thumbnail";
        var thumbnailElemNS = SVGElement(this.width, this.height, this.thumbnailWidth, this.thumbnailHeight, "svg", id);
        var thumbnailDIV = makeDiv(id + "_container", svg.name, this.thumbnailDivClass);
        var deleteButton = makeButton(this.trashicon +  " delete");
        
        var saveButton = makeButton(this.saveicon +  " download svg");
        var loadButton = makeButton(this.editicon +  "edit tile");
        thumbnailDIV.appendChild(thumbnailElemNS);
        thumbnailDIV.appendChild(deleteButton);
        thumbnailDIV.appendChild(saveButton);
        thumbnailDIV.appendChild(loadButton);

        $("#" + this.thumbnailDivID).append(thumbnailDIV);
        var thumbnailElement = document.getElementById(id);
        this.thumbnailDivs[thumbnailDIV.id] = thumbnailDIV;
        
        svg.changeElement(thumbnailElement);

        this.thumbnails[thumbnailElement.id] = svg;


        deleteButton.onclick = this.deleteDrawingLambda(thumbnailDIV,thumbnailElement);
        saveButton.onclick = this.downloadDrawingLambda(svg);
        loadButton.onclick = this.loadDrawingLambda(thumbnailDIV,thumbnailElement, svg);
    }
    loadDrawingLambda(thumbnailDIV,thumbnailElement, svg){
        const svgDelete = this.deleteDrawingLambda(thumbnailDIV, thumbnailElement);
        const svgEdit = this.editDrawingLambda(svg);
        const svgLoad = (e) => {
            this.resetLambda();
            svgDelete();
            svgEdit();
        }
        return svgLoad;

    }
    editDrawingLambda(svg){
        const editDrawing = (e) =>{
            setup(svg);
        }
        return editDrawing

    }
    downloadDrawingLambda(svg){
        const downloadDrawing = (e) => {
            downloadSVG(svg.element, svg.name);
        }
        return downloadDrawing;

    }
    deleteDrawingLambda(thumbnailDIV,thumbnailElement){
        const deleteDrawing = (e) => {
            delete this.thumbnails[thumbnailElement.id];
            delete this.thumbnailDivs[thumbnailDIV.id];
            this.render();
        }
        return deleteDrawing;

    }
    render(){
        var thumbnailDiv = document.getElementById(this.thumbnailDivID)
        thumbnailDiv.innerHTML = "";
        Object.entries(this.thumbnailDivs).forEach(([_, elem]) => thumbnailDiv.appendChild(elem))
        Object.entries(this.thumbnails).forEach(([_, svg]) => svg.reRender());
        thumbnailDiv.appendChild(this.downloadProjectButton);
    }
    export(){
        return Object.entries(this.thumbnails).map(([_, svg]) => svg);
    }
    downloadProjectLambda(){
        const downloadProject = () =>{
            var exportName = "project_file"
            //https://stackoverflow.com/questions/19721439/download-json-object-as-a-file-from-browser
            var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.thumbnails));
            sessionStorage.setItem(this.sessionStorageKey, JSON.stringify(this.thumbnails));
            var downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href",     dataStr);
            downloadAnchorNode.setAttribute("download", exportName + ".json");
            document.body.appendChild(downloadAnchorNode); // required for firefox
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        }
        return downloadProject
      }
    
}
const width = 800;
const height = 600;
const thumbnailHeight = Math.ceil(height / 4);
const thumbnailWidth = Math.ceil(width / 4);
const thumbnailDivClass = "thumbnail-container"
const thumbnailDivID = "thumbnail-container"
const selectedCSS = "selected-element" 
const layerDivID = "layer-container"
const svgID = "svgElement";
const svgClass = "svg";
const drawMode = "draw";
const drawModeButtonID = "draw-button";
const selectMode = "select";
const selectModeButtonID = "select-button";


var SETMODE = drawMode;
const modeInfo = [
    {
        modeName: drawMode,
        modeButtonDivID: drawModeButtonID
    },
    {
        modeName: selectMode,
        modeButtonDivID: selectModeButtonID
    },
]
var pressed = false;
const outlineLayer = "border";
const orientLayer = "orient";
const constructionLayer = "construction";
var LAYERSELECTED = constructionLayer;
const trashicon = `<i class="fa fa-trash" aria-hidden="true"></i>`
const clearicon = `<i class="fa fa-times" aria-hidden="true"></i>`
const savefileicon = ` <i class="fa fa-download" aria-hidden="true"></i> `
const editicon = `<i class="fa fa-pencil" aria-hidden="true"></i> `
const sessionStorageKey = "project"
var svgElement = null;
var svg = null;
var select = null;
var layerthumbnails = null;
var selectpointsmode = null;
var assemblerElement = assemblerStart();
const layerInfo = 
[
    {
        name: outlineLayer,
        color: "#0000FF",
    },
    {
        name: orientLayer,
        color: "#00FF00",
    },
    {
        name: constructionLayer,
        color: "#000000",
    }
]



setup();
var thumbnailsobj = new Thumbnails(width, height, thumbnailWidth, thumbnailHeight, thumbnailDivClass, thumbnailDivID, trashicon,savefileicon, editicon, layerthumbnails.destroyLambda, sessionStorageKey );
thumbnailsobj.render();


var xMousePos = 0;
var yMousePos = 0;
var lastScrolledLeft = 0;
var lastScrolledTop = 0;

$(document).mousemove(function(event) {
    captureMousePosition(event);
})  
    $(window).scroll(function(event) {
        if(lastScrolledLeft != $(document).scrollLeft()){
            xMousePos -= lastScrolledLeft;
            lastScrolledLeft = $(document).scrollLeft();
            xMousePos += lastScrolledLeft;
        }
        if(lastScrolledTop != $(document).scrollTop()){
            yMousePos -= lastScrolledTop;
            lastScrolledTop = $(document).scrollTop();
            yMousePos += lastScrolledTop;
        }
        window.status = "x = " + xMousePos + " y = " + yMousePos;
    });
function captureMousePosition(event){
    xMousePos = event.pageX;
    yMousePos = event.pageY;
    window.status = "x = " + xMousePos + " y = " + yMousePos;
}
function downloadAssemblage(){
    if(assemblerElement){
        downloadSVG(assemblerElement, "assemblage")
    }
}

function reset(){
    // thumbnailsobj.resetLambda = 

    thumbnailsobj.addThumbnail(svg);
    layerthumbnails.destroy();
    setup();
    thumbnailsobj.render();
}
if (typeof(module) !== "undefined") {
	module.exports.Svg = Svg;
    module.exports.layerInfo = layerInfo;
    module.exports.width = width;
    module.exports.height = height;
    module.exports.relativeMousePosition = relativeMousePosition;
    module.exports.SVGElement = SVGElement;
}
