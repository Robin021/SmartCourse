"use client";

import { useState, useCallback } from "react";
import { Q1_FORM_SCHEMA, getDefaultQ1FormData } from "@/lib/q1/q1FormConfig";

interface Q1SWOTFormProps {
    initialData?: Record<string, any>;
    onChange?: (data: Record<string, any>) => void;
    onSubmit?: (data: Record<string, any>) => void;
    isLoading?: boolean;
}

/**
 * Q1 SWOT Analysis Form Component
 * 
 * Renders the SWOT analysis form with 20 items:
 * - 5 Strengths (internal)
 * - 5 Weaknesses (internal)
 * - 5 Opportunities (external)
 * - 5 Threats (external)
 * 
 * Based on Requirements 1.1, 1.2
 */
export function Q1SWOTForm({
    initialData,
    onChange,
    onSubmit,
    isLoading = false,
}: Q1SWOTFormProps) {
    const [formData, setFormData] = useState<Record<string, any>>(
        initialData || getDefaultQ1FormData()
    );
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleFieldChange = useCallback(
        (key: string, value: any) => {
            const newData = { ...formData, [key]: value };
            setFormData(newData);
            
            // Clear error for this field
            if (errors[key]) {
                setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors[key];
                    return newErrors;
                });
            }
            
            onChange?.(newData);
        },
        [formData, errors, onChange]
    );

    const validateForm = useCallback(() => {
        const newErrors: Record<string, string> = {};
        
        // Validate required fields
        for (const section of Q1_FORM_SCHEMA.sections) {
            for (const field of section.fields) {
                if (field.required) {
                    const value = formData[field.key];
                    if (!value || (typeof value === "string" && !value.trim())) {
                        newErrors[field.key] = `${field.label}是必填项`;
                    }
                }
                
                // Validate score range
                if (field.type === "number" && field.min !== undefined && field.max !== undefined) {
                    const value = parseInt(formData[field.key], 10);
                    if (!isNaN(value) && (value < field.min || value > field.max)) {
                        newErrors[field.key] = `${field.label}必须在${field.min}-${field.max}之间`;
                    }
                }
            }
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData]);

    const handleSubmit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            
            if (validateForm()) {
                onSubmit?.(formData);
            }
        },
        [formData, validateForm, onSubmit]
    );

    const renderField = (field: typeof Q1_FORM_SCHEMA.sections[0]["fields"][0]) => {
        const value = formData[field.key] || "";
        const error = errors[field.key];
        
        const baseInputClass = `
            flex w-full rounded-md border bg-background px-3 py-2 text-sm
            ring-offset-background placeholder:text-muted-foreground
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
            disabled:cursor-not-allowed disabled:opacity-50
            ${error ? "border-red-500" : "border-input"}
        `;

        switch (field.type) {
            case "textarea":
                return (
                    <textarea
                        className={`${baseInputClass} min-h-[80px]`}
                        value={value}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        disabled={isLoading}
                    />
                );
            
            case "select":
                return (
                    <select
                        className={`${baseInputClass} h-10`}
                        value={value}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        disabled={isLoading}
                    >
                        <option value="">请选择...</option>
                        {field.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                );
            
            case "number":
                return (
                    <input
                        type="number"
                        className={`${baseInputClass} h-10`}
                        value={value}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        min={field.min}
                        max={field.max}
                        disabled={isLoading}
                    />
                );
            
            default:
                return (
                    <input
                        type="text"
                        className={`${baseInputClass} h-10`}
                        value={value}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        disabled={isLoading}
                    />
                );
        }
    };

    // Get section style based on SWOT type
    const getSectionStyle = (type: string) => {
        switch (type) {
            case "strength":
                return "border-l-4 border-l-green-500 bg-green-50/30 dark:bg-green-950/20";
            case "weakness":
                return "border-l-4 border-l-red-500 bg-red-50/30 dark:bg-red-950/20";
            case "opportunity":
                return "border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/20";
            case "threat":
                return "border-l-4 border-l-orange-500 bg-orange-50/30 dark:bg-orange-950/20";
            default:
                return "border-l-4 border-l-gray-300";
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-xl font-semibold">{Q1_FORM_SCHEMA.name}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    {Q1_FORM_SCHEMA.description}
                </p>
            </div>

            {/* Sections */}
            {Q1_FORM_SCHEMA.sections.map((section) => (
                <div
                    key={section.id}
                    className={`rounded-lg p-4 ${getSectionStyle(section.type)}`}
                >
                    <h3 className="text-lg font-medium mb-2">{section.title}</h3>
                    {section.description && (
                        <p className="text-sm text-muted-foreground mb-4">
                            {section.description}
                        </p>
                    )}
                    
                    <div className="grid gap-4">
                        {section.fields.map((field) => (
                            <div key={field.key} className="space-y-2">
                                <label className="text-sm font-medium leading-none">
                                    {field.label}
                                    {field.required && (
                                        <span className="text-red-500 ml-1">*</span>
                                    )}
                                </label>
                                {renderField(field)}
                                {errors[field.key] && (
                                    <p className="text-xs text-red-500">
                                        {errors[field.key]}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
                <button
                    type="submit"
                    disabled={isLoading}
                    className={`
                        px-6 py-2 rounded-md font-medium text-white
                        ${isLoading 
                            ? "bg-gray-400 cursor-not-allowed" 
                            : "bg-primary hover:bg-primary/90"
                        }
                    `}
                >
                    {isLoading ? "生成中..." : "生成分析报告"}
                </button>
            </div>
        </form>
    );
}

export default Q1SWOTForm;
