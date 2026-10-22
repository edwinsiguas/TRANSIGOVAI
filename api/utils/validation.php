<?php

class Validator {
    private $errors = [];

    public function validate($data, $rules) {
        $this->errors = [];

        foreach ($rules as $field => $fieldRules) {
            $value = $data[$field] ?? null;
            $rules_array = is_string($fieldRules) ? explode('|', $fieldRules) : $fieldRules;

            foreach ($rules_array as $rule) {
                $this->applyRule($field, $value, $rule, $data);
            }
        }

        return empty($this->errors);
    }

    private function applyRule($field, $value, $rule, $data) {
        [$ruleName, $parameter] = $this->parseRule($rule);

        switch ($ruleName) {
            case 'required':
                if (empty($value)) {
                    $this->errors[$field] = "El campo $field es obligatorio";
                }
                break;

            case 'email':
                if ($value && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
                    $this->errors[$field] = "El email no es válido";
                }
                break;

            case 'min':
                if ($value && strlen($value) < (int)$parameter) {
                    $this->errors[$field] = "El campo $field debe tener al menos $parameter caracteres";
                }
                break;

            case 'max':
                if ($value && strlen($value) > (int)$parameter) {
                    $this->errors[$field] = "El campo $field no debe exceder $parameter caracteres";
                }
                break;

            case 'numeric':
                if ($value && !is_numeric($value)) {
                    $this->errors[$field] = "El campo $field debe ser numérico";
                }
                break;

            case 'dni':
                if ($value && !preg_match('/^\d{8}$/', $value)) {
                    $this->errors[$field] = "El DNI debe tener 8 dígitos";
                }
                break;

            case 'ruc':
                if ($value && !preg_match('/^\d{11}$/', $value)) {
                    $this->errors[$field] = "El RUC debe tener 11 dígitos";
                }
                break;

            case 'phone':
                if ($value && !preg_match('/^\d{7,15}$/', $value)) {
                    $this->errors[$field] = "El teléfono no es válido";
                }
                break;

            case 'date':
                if ($value && !strtotime($value)) {
                    $this->errors[$field] = "La fecha $field no es válida";
                }
                break;

            case 'future_date':
                if ($value && strtotime($value) <= strtotime('today')) {
                    $this->errors[$field] = "La fecha debe ser posterior a hoy";
                }
                break;

            case 'unique':

                break;

            case 'in':
                $values = explode(',', $parameter);
                if ($value && !in_array($value, $values)) {
                    $this->errors[$field] = "El valor de $field no es válido";
                }
                break;
        }
    }

    private function parseRule($rule) {
        if (strpos($rule, ':') === false) {
            return [$rule, null];
        }

        [$ruleName, $parameter] = explode(':', $rule, 2);
        return [$ruleName, $parameter];
    }

    public function getErrors() {
        return $this->errors;
    }

    public function getFirstError() {
        return reset($this->errors) ?: null;
    }

    public function hasErrors() {
        return !empty($this->errors);
    }
}

class DatabaseValidator {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function isUnique($table, $field, $value, $excludeId = null) {
        $query = "SELECT COUNT(*) as count FROM $table WHERE $field = ?";
        $params = [$value];

        if ($excludeId) {
            $query .= " AND id != ?";
            $params[] = $excludeId;
        }

        $stmt = $this->pdo->prepare($query);
        $stmt->execute($params);
        $result = $stmt->fetch();

        return $result['count'] == 0;
    }

    public function existsRecord($table, $id) {
        $stmt = $this->pdo->prepare("SELECT COUNT(*) as count FROM $table WHERE id = ?");
        $stmt->execute([$id]);
        $result = $stmt->fetch();
        return $result['count'] > 0;
    }

    public function existsActiveRecord($table, $id, $statusColumn = 'estado', $activeValue = 'activo') {
        $stmt = $this->pdo->prepare("SELECT COUNT(*) as count FROM $table WHERE id = ? AND $statusColumn = ?");
        $stmt->execute([$id, $activeValue]);
        $result = $stmt->fetch();
        return $result['count'] > 0;
    }

    public function existsRelation($table, $field, $value) {
        $stmt = $this->pdo->prepare("SELECT COUNT(*) as count FROM $table WHERE $field = ?");
        $stmt->execute([$value]);
        $result = $stmt->fetch();
        return $result['count'] > 0;
    }
}

?>
