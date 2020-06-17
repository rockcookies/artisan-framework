# Artisan Framework

Artisan Framework is a serverless First, scalable and componentized application framework developed by TypeScript.

**Features**

1. Based on TypeScript
1. Zero configuration
1. Spring Boot-like development experience
1. Serverless First
1. componentization
1. Aspect-oriented programming (AOP)
1. Integrated ORM framework
1. The command tool is extensible


## Dependency injection

```typescript
@component()
export class A {

}

@component()
export class B {
    @autowired()
    protected a: A;
}
```

## Property injection

```typescript
@component()
export class A {
    @value('foo') // Support EL expression syntax, such as @value ('obj.xxx'), @value ('arr [1]'), etc.
    protected foo: string;
}
```
