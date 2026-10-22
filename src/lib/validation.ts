export const REGEX_DNI = /^\d{8}$/
export const REGEX_RUC = /^\d{11}$/
export const REGEX_PHONE = /^\d{7,15}$/

export const REGEX_PLACA_PERU = /^(?:[A-Z0-9]{6}|[A-Z0-9]{3}-[A-Z0-9]{3}|[A-Z0-9]{2}-[A-Z0-9]{4})$/i

export const REGEX_NAME = /^[A-Za-z\u00C0-\u017F0-9'.,\-\s]+$/

// Formato alfanumerico para licencias comunes.
export const REGEX_LICENSE = /^[A-Za-z0-9\-]{5,20}$/

// VIN estandar de 17 caracteres (sin I, O, Q).
export const REGEX_VIN = /^[A-HJ-NPR-Z0-9]{17}$/i

export function isDateTodayOrFuture(value: string): boolean {
    if (!value) return false

    const input = new Date(`${value}T00:00:00`)
    if (Number.isNaN(input.getTime())) return false

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return input.getTime() >= today.getTime()
}

export function isDateFuture(value: string): boolean {
    if (!value) return false

    const input = new Date(`${value}T00:00:00`)
    if (Number.isNaN(input.getTime())) return false

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return input.getTime() > today.getTime()
}
