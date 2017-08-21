var myjson = jQuery.getJSON("http://localhost:8000/data.json", function(json){
  
  var jsonTerraformSecurityGroups = myjson.responseJSON.resource.aws_security_group;
  var jsonTerraformSecurityGroupRules = myjson.responseJSON.resource.aws_security_group_rule;
  console.log (jsonTerraformSecurityGroups);
  
  // Generate gojs-friendly json
  //////////////////////////////

  // json object for security group
  var jsonGoJSSecurityGroups = {nodeDataArray: []};
  var jsonGoJSSecurityGroupRules = {linkDataArray: []};


  // Generate names
  for(var name in jsonTerraformSecurityGroups) {
    if(jsonTerraformSecurityGroups.hasOwnProperty(name)) {
        var jsonObj = jsonTerraformSecurityGroups[name]

        var sg = {};
        sg.items = [] 

        sg.name = name; 
        sg.items.push( { "name": "name", "value": name } )

        var fieldList = ['vpcid']
        for (var i in fieldList) {
          sg.items.push( { "name": fieldList[i], "value": jsonObj[fieldList[i]] } )
        }
        //sg.tags = jsonObj.tags

        jsonGoJSSecurityGroups.nodeDataArray.push(sg);
    }
  } 

  // Generate names
  for(var name in jsonTerraformSecurityGroupRules) {
    if(jsonTerraformSecurityGroupRules.hasOwnProperty(name)) {
        var jsonObj = jsonTerraformSecurityGroupRules[name]

        var sg = {};

        sg.name = name; 
        sg.items = [] 

        // Name is for debug only
        //sg.items.push( { "name": "name", "value": name } )        
        
        // Set all the other fields
        var fieldList = ['type','from_port','to_port','protocol','security_group_id','source_security_group_id']
        for (var i in fieldList) {
          sg.items.push( { "name": fieldList[i], "value": jsonObj[fieldList[i]] } )
        }

 				var myRegexp = /^\$\{aws_security_group.(.*).id\}$/g;
				var match = myRegexp.exec(jsonObj['source_security_group_id']);
				sg.from = match[1];

        // Set From Port
 				var myRegexp = /^\$\{aws_security_group.(.*).id\}$/g;
				var match = myRegexp.exec(jsonObj['security_group_id']);
				sg.to = match[1];


        jsonGoJSSecurityGroupRules.linkDataArray.push(sg);
    }
  }
  console.log(JSON.stringify(jsonGoJSSecurityGroupRules))

  jsonGoJS = jQuery.extend(jsonGoJSSecurityGroupRules,jsonGoJSSecurityGroups)
  jsonGoJS = jQuery.extend(jsonGoJS,{"nodeKeyProperty": "name"})


  // Graph settings
	var $ = go.GraphObject.make;
    myDiagram =
      $(go.Diagram, "myDiagramDiv",  // must name or refer to the DIV HTML element
        {
          initialContentAlignment: go.Spot.Center,
          allowDelete: false,
          allowCopy: false,
          //layout: $(go.ForceDirectedLayout),

          layout: $(go.LayeredDigraphLayout, { 
          	layerSpacing: 250, 
          	columnSpacing: 100,
          	direction: 0,
          	setsPortSpots: true,
          	layeringOption: go.LayeredDigraphLayout.LayerLongestPathSink 
          }),
          "undoManager.isEnabled": true
        });

  // Template for securitygroups
  var templSecurityGroup =
    $(go.Panel, "Horizontal",
      $(go.TextBlock,
	      { stroke: "black", font: "bold 14px sans-serif" },
        new go.Binding("text", "name")),
      $(go.TextBlock,
        { margin: 5, editable: true },
        new go.Binding("text", "value"))
    );

	// Generate nodes
	myDiagram.nodeTemplate =
	  $(go.Node, "Vertical",
      {        
        isShadowed: true,
        background: "#f2f2f2" },
	    
	    // Icon
	    $(go.Picture,
	      { margin: 10, width: 50, height: 50, background: "orange" }),
	    
	    // Title
	    $(go.TextBlock,
	      { margin: 3, stroke: "black", font: "bold 16px sans-serif", alignment: go.Spot.TopLeft },
	      new go.Binding("text", "name")),

	    // The data
      $(go.Panel, "Table",
        {
          maxSize: new go.Size(200, 999),
          margin: 5,
          defaultAlignment: go.Spot.Left
        },
        $(go.RowColumnDefinition, { column: 2, width: 4 }),
        
        // Generate the table
          $(go.Panel, "Vertical",
            {
              name: "LIST",
              row: 1,
              padding: 1,
              alignment: go.Spot.TopLeft,
              defaultAlignment: go.Spot.Left,
              stretch: go.GraphObject.Horizontal,
              itemTemplate: templSecurityGroup,
            },
            new go.Binding("itemArray", "items").makeTwoWay()),
          )
	  );



    myDiagram.linkTemplate =
      $(go.Link, go.Link.AvoidsNodes,
        { isShadowed: true, corner: 5, relinkableFrom: true, relinkableTo: true },
        $(go.Shape, { strokeWidth: 4, stroke: "Black" }),  // the link shape
        $(go.Shape,  // the arrowhead
          { scale: 2, toArrow: "standard", stroke: "Black", fill: "Orange" }),
        $(go.Panel,	"Vertical",    // Icon

          { 
            background: "#f2f2f2",  
            margin: 5,
            defaultAlignment: go.Spot.Left
	        },

		    // The data
	      $(go.Panel, "Table",
	        {
	          maxSize: new go.Size(200, 999),
	          margin: new go.Margin(6, 10, 0, 3),
	          defaultAlignment: go.Spot.Left
	        },
	        $(go.RowColumnDefinition, { column: 2, width: 4 }),
	        
	        // Generate the table
	          $(go.Panel, "Vertical",
	            {
	              name: "LIST",
	              row: 1,
	              padding: 3,
	              alignment: go.Spot.TopLeft,
	              defaultAlignment: go.Spot.Left,
	              stretch: go.GraphObject.Horizontal,
	              itemTemplate: templSecurityGroup
	            },
	            new go.Binding("itemArray", "items").makeTwoWay()),
	          )

        )
      );

  // Draw it
	myDiagram.model =  go.Model.fromJson(JSON.stringify(jsonGoJS));
	//myDiagram.model = new go.GraphLinksModel(nodeDataArray, linkDataArray);
});
