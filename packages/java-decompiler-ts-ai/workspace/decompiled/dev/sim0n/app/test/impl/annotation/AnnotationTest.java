package dev.sim0n.app.test.impl.annotation;

import dev.sim0n.app.test.Test;

public class AnnotationTest implements Test {
    public void run() {
        Class<?> clazz = AnnotationTest.class;
        if (!clazz.isAnnotationPresent(TestAnnotation.class)) {
            throw new IllegalStateException("Annotation not present");
        }
        TestAnnotation annotation = clazz.getAnnotation(TestAnnotation.class);
        String value = annotation.string();
        double doubleValue = annotation.doubleValue();
        int intValue = annotation.intValue();
        System.out.println("Testing annotations");
        Object[] tmpArray1 = new Object[3];
        tmpArray1[0] = value;
        tmpArray1[1] = doubleValue;
        tmpArray1[2] = intValue;
        System.out.printf("%s, %s, %d%n", tmpArray1);
    }
}