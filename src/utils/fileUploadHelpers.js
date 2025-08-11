/**
 * Helper functions for file upload operations
 */


/**
 * Validate upload configuration and permissions
 * @param {Object|boolean} uploads - Upload configuration
 * @param {Object} endpoints - API endpoints
 * @param {Object} panel - Kirby panel instance
 * @returns {boolean} Whether uploads can proceed
 */
export function validateUploadConfig(uploads, endpoints, panel) {
	if (!uploads || uploads === false) {
		panel.notification.error('Uploads are not enabled for this field');
		return false;
	}
	
	if (!endpoints?.field) {
		panel.notification.error('Upload endpoint not configured');
		return false;
	}
	
	return true;
}

/**
 * Build upload options object for Kirby panel
 * @param {Object} endpoints - API endpoints
 * @param {Object} uploads - Upload configuration
 * @param {Object} panel - Kirby panel instance
 * @returns {Object} Upload options for panel.upload.open()
 */
export function buildUploadOptions(endpoints, uploads, panel) {
	const options = {
		url: panel.urls.api + "/" + endpoints.field + "/upload",
		multiple: false
	};
	
	// Add upload attributes if specified
	if (uploads.template || uploads.parent) {
		options.attributes = {};
		if (uploads.template) {
			options.attributes.template = uploads.template;
		}
		if (uploads.parent) {
			options.attributes.parent = uploads.parent;
		}
	}
	
	return options;
}

/**
 * Process uploaded files and generate content
 * @param {Array} uploadedFiles - Array of uploaded file data
 * @returns {Array} Array of content strings for insertion
 */
export function processUploadedFiles(uploadedFiles) {
	if (!uploadedFiles?.length) {
		return [];
	}
	
	return uploadedFiles
		.map((fileArray) => {
			// Each upload is nested: uploadedFiles[0][0] contains the actual file
			const file = fileArray[0];
			if (!file?.dragText) {
					return null;
			}
			return file.dragText;
		})
		.filter(Boolean);
}

/**
 * Prepare content for insertion at drop position
 * @param {Array} contents - Array of content strings
 * @param {number} dropPosition - Position in editor to insert
 * @param {Object} editor - Tiptap editor instance
 * @returns {string} Formatted content ready for insertion
 */
export function prepareInsertionContent(contents, dropPosition, editor) {
	if (!contents.length) {
		return '';
	}
	
	// Check if we need a space before insertion
	const prevChar = dropPosition > 0 
		? editor.state.doc.textBetween(dropPosition - 1, dropPosition)
		: '';
	const needsSpace = prevChar && prevChar !== ' ' && prevChar !== '\n';
	
	// Join contents with double line breaks
	const joinedContent = contents.join('\n\n');
	
	// Add space if needed
	return needsSpace ? ' ' + joinedContent : joinedContent;
}

/**
 * Insert content at specified position in editor
 * @param {Object} editor - Tiptap editor instance
 * @param {number} position - Position to insert at
 * @param {string} content - Content to insert
 */
export function insertContentAtPosition(editor, position, content) {
	if (!content) {
		return;
	}
	
	editor
		.chain()
		.focus()
		.insertContentAt(position, content, {
			parseOptions: { preserveWhitespace: true }
		})
		.unsetAllMarks()
		.run();
	
}

/**
 * Create upload success handler
 * @param {Object} editorRef - Editor reference
 * @param {number} dropPosition - Drop position
 * @param {Object} panel - Kirby panel instance
 * @returns {Function} Success handler function
 */
export function createUploadSuccessHandler(editorRef, dropPosition, panel) {
	return (uploadedFiles) => {
		try {
			// Restore selection to drop position
			editorRef.value.commands.setTextSelection({ 
				from: dropPosition, 
				to: dropPosition 
			});
			
			// Process uploaded files
			const contents = processUploadedFiles(uploadedFiles);
			
			if (contents.length > 0) {
				const finalContent = prepareInsertionContent(
					contents, 
					dropPosition, 
					editorRef.value
				);
				
				insertContentAtPosition(
					editorRef.value, 
					dropPosition, 
					finalContent
				);
				
				panel.notification.success('File uploaded and inserted successfully');
			} else {
				panel.notification.error('No content could be generated from uploaded files');
			}
		} catch (error) {
			console.error('File upload processing error:', error);
			panel.notification.error('Failed to process uploaded file');
		}
	};
}

/**
 * Create upload error handler
 * @param {Object} editorRef - Editor reference
 * @param {number} originalFrom - Original selection start
 * @param {number} originalTo - Original selection end
 * @param {Object} panel - Kirby panel instance
 * @returns {Function} Error handler function
 */
export function createUploadErrorHandler(editorRef, originalFrom, originalTo, panel) {
	return (error) => {
		console.error('File upload error:', error);
		panel.notification.error('Upload failed');
		// Restore original selection
		editorRef.value.commands.setTextSelection({ 
			from: originalFrom, 
			to: originalTo 
		});
	};
}

/**
 * Create upload cancel handler
 * @param {Object} editorRef - Editor reference
 * @param {number} originalFrom - Original selection start
 * @param {number} originalTo - Original selection end
 * @returns {Function} Cancel handler function
 */
export function createUploadCancelHandler(editorRef, originalFrom, originalTo) {
	return () => {
		// Restore original selection
		editorRef.value.commands.setTextSelection({ 
			from: originalFrom, 
			to: originalTo 
		});
	};
}