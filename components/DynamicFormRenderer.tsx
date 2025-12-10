"use client";

export function DynamicFormRenderer({ schema, data, onChange }: any) {
    const toggleMultiSelect = (key: string, option: string, checked: boolean) => {
        const current = Array.isArray(data?.[key]) ? data[key] : [];
        const next = checked
            ? Array.from(new Set([...current, option]))
            : current.filter((v: string) => v !== option);
        onChange(key, next);
    };

    const renderField = (field: any) => {
        if (field.type === "textarea") {
            return (
                <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={data?.[field.key] || ""}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                />
            );
        }

        if (field.type === "multiselect") {
            const selected = Array.isArray(data?.[field.key]) ? data[field.key] : [];
            return (
                <div className="space-y-2">
                    {field.options?.map((option: any) => (
                        <label key={option.value} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <input
                                type="checkbox"
                                checked={selected.includes(option.value)}
                                onChange={(e) => toggleMultiSelect(field.key, option.value, e.target.checked)}
                                className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary/30"
                            />
                            <span className="text-foreground">{option.label}</span>
                        </label>
                    ))}
                </div>
            );
        }

        if (field.type === "select") {
            return (
                <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={data?.[field.key] || ""}
                    onChange={(e) => onChange(field.key, e.target.value)}
                >
                    <option value="">请选择</option>
                    {field.options?.map((option: any) => (
                        <option key={option.value ?? option} value={option.value ?? option}>
                            {option.label ?? option}
                        </option>
                    ))}
                </select>
            );
        }

        return (
            <input
                type={field.type}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={data?.[field.key] || ""}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={field.placeholder}
            />
        );
    };

    return (
        <div className="p-6 space-y-6">
            <div className="space-y-4">
                {schema?.sections?.map((section: any, idx: number) => (
                    <div key={idx} className="space-y-4">
                        <h3 className="text-lg font-medium">{section.title}</h3>
                        <div className="grid gap-4">
                            {section.fields.map((field: any) => (
                                <div key={field.key} className="space-y-2">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        {field.label}
                                        {field.required && <span className="text-red-500">*</span>}
                                        {field.helpText && (
                                            <span className="ml-2 text-xs text-muted-foreground">{field.helpText}</span>
                                        )}
                                    </label>
                                    {renderField(field)}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
