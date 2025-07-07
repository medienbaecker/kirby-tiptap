<?php

namespace Medienbaecker\Tiptap\Extensions;

use Tiptap\Core\Extension;
use Tiptap\Utils\HTML;

/**
 * Extension for adding custom attributes to any node type
 */
class CustomAttributes extends Extension
{
    public static $name = 'customAttributes';

    public function addOptions()
    {
        return [
            'customButtons' => [], // Custom button configurations from field options
        ];
    }

    public function addGlobalAttributes()
    {
        $globalAttributes = [];
        
        // Process each custom button configuration
        foreach ($this->options['customButtons'] as $buttonName => $buttonConfig) {
            if (!isset($buttonConfig['attributes']) || !isset($buttonConfig['nodes'])) {
                continue;
            }

            // Get the node types this button applies to
            $nodeTypes = $buttonConfig['nodes'];
            
            // Create attribute definitions for each attribute in the button
            $attributeDefinitions = [];
            foreach ($buttonConfig['attributes'] as $attributeName => $defaultValue) {
                $attributeDefinitions[$attributeName] = [
                    'default' => null,
                    'parseHTML' => function ($DOMNode) use ($attributeName) {
                        return $DOMNode->getAttribute($attributeName) ?: null;
                    },
                    'renderHTML' => function ($attributes) use ($attributeName) {
                        if (!isset($attributes->{$attributeName}) || $attributes->{$attributeName} === null) {
                            return null;
                        }
                        
                        // Handle potential object serialization issues
                        $value = $attributes->{$attributeName};
                        if (is_object($value) || is_array($value)) {
                            // Skip invalid values to prevent [object Object] issues
                            return null;
                        }
                        
                        return [$attributeName => $value];
                    },
                ];
            }

            // Add global attributes for these node types
            $globalAttributes[] = [
                'types' => $nodeTypes,
                'attributes' => $attributeDefinitions,
            ];
        }

        return $globalAttributes;
    }
}